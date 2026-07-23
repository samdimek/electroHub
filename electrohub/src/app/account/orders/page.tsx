import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { OrderHistoryClient } from '@/components/storefront/OrderHistoryClient';

export default function OrderHistoryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <OrderHistoryClient />
      <Footer />
    </div>
  );
}
