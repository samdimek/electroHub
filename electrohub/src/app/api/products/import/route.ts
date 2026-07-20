import { type NextRequest } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { requirePermission, isAdmin } from '@/lib/rbac';
import { productImportRowSchema } from '@/lib/validation/product';
import { withApiErrorHandling, ApiError, ok } from '@/lib/apiResponse';
import { writeAuditLog } from '@/lib/audit';
import { invalidatePrefix } from '@/lib/redis';

const MAX_ROWS = 2000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseRows(buffer: Buffer, filename: string): Record<string, unknown>[] {
  const isExcel = /\.xlsx?$/i.test(filename);
  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    return XLSX.utils.sheet_to_json(sheet!, { defval: '' });
  }
  const text = buffer.toString('utf-8');
  const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return parsed.data;
}

/** Maps loosely-cased spreadsheet headers onto our strict schema field names. */
function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    title: 'title',
    name: 'title',
    description: 'description',
    sku: 'sku',
    category: 'categorySlug',
    categoryslug: 'categorySlug',
    brand: 'brand',
    price: 'priceCents',
    pricecents: 'priceCents',
    compareat: 'compareAtCents',
    compareatcents: 'compareAtCents',
    quantity: 'quantity',
    stock: 'quantity',
    warrantymonths: 'warrantyMonths',
    status: 'status',
  };
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = map[key.trim().toLowerCase().replace(/\s+/g, '')];
    if (mapped) normalized[mapped] = value;
  }
  return normalized;
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    requirePermission(user, 'PRODUCTS_WRITE');

    const vendor = isAdmin(user)
      ? await db.vendor.findUnique({ where: { id: new URL(request.url).searchParams.get('vendorId') ?? '' } })
      : await db.vendor.findFirst({ where: { members: { some: { userId: user.id } } } });

    if (!vendor) throw new ApiError(400, 'No vendor store associated with this account');
    if (vendor.status !== 'APPROVED') throw new ApiError(403, 'Vendor store is not approved yet');

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'Attach a CSV or Excel file under the "file" field');
    if (file.size > MAX_FILE_BYTES) throw new ApiError(400, 'File too large (max 10MB)');

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = parseRows(buffer, file.name);
    if (rawRows.length === 0) throw new ApiError(400, 'No rows found in file');
    if (rawRows.length > MAX_ROWS) throw new ApiError(400, `Too many rows (max ${MAX_ROWS} per import)`);

    // Preload electronics categories once; every row's category must
    // resolve to one of these — same electronics-only enforcement as the
    // single-product create path.
    const categories = await db.category.findMany({ where: { isElectronics: true } });
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    const results: { row: number; sku: string; status: 'created' | 'error'; error?: string }[] = [];
    let created = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // account for header row, 1-indexed
      try {
        const normalized = normalizeRow(rawRows[i]!);
        const parsedRow = productImportRowSchema.parse(normalized);

        const category = categoryBySlug.get(parsedRow.categorySlug.toLowerCase());
        if (!category) {
          throw new Error(`Unknown or non-electronics category "${parsedRow.categorySlug}"`);
        }

        const baseSlug = slugify(parsedRow.title);
        let slug = baseSlug;
        let suffix = 1;
        while (await db.product.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${++suffix}`;
        }

        await db.product.upsert({
          where: { vendorId_sku: { vendorId: vendor.id, sku: parsedRow.sku } },
          create: {
            vendorId: vendor.id,
            categoryId: category.id,
            title: parsedRow.title,
            slug,
            description: parsedRow.description,
            brand: parsedRow.brand,
            sku: parsedRow.sku,
            status: parsedRow.status,
            priceCents: parsedRow.priceCents,
            compareAtCents: parsedRow.compareAtCents,
            warrantyMonths: parsedRow.warrantyMonths,
            inventory: { create: { quantityOnHand: parsedRow.quantity } },
          },
          update: {
            title: parsedRow.title,
            description: parsedRow.description,
            brand: parsedRow.brand,
            priceCents: parsedRow.priceCents,
            compareAtCents: parsedRow.compareAtCents,
            warrantyMonths: parsedRow.warrantyMonths,
            status: parsedRow.status,
            categoryId: category.id,
          },
        });

        created++;
        results.push({ row: rowNumber, sku: parsedRow.sku, status: 'created' });
      } catch (err) {
        results.push({
          row: rowNumber,
          sku: String((rawRows[i] as Record<string, unknown>)?.sku ?? ''),
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await invalidatePrefix('products:list:');
    await writeAuditLog({
      actor: user,
      action: 'product.bulk_import',
      entityType: 'Vendor',
      entityId: vendor.id,
      metadata: { filename: file.name, totalRows: rawRows.length, created, failed: rawRows.length - created },
      request,
    });

    return ok({ totalRows: rawRows.length, created, failed: rawRows.length - created, results });
  });
}
