import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ProductDetails from "@/pages/ProductDetails";
import { AuthProvider } from "@/context/AuthContext";
import TrackOrders from "@/pages/TrackOrders";
import PayPalSuccess from "@/pages/PayPalSuccess";
import PayPalCancel from "@/pages/PayPalCancel";
import ShippingPage from "@/pages/policies/ShippingPage";
import RefundPage from "@/pages/policies/RefundPage";
import PrivacyPage from "@/pages/policies/PrivacyPage";
import Terms from "@/pages/policies/Terms";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:slug" element={<ProductDetails />} />
          <Route path="/orders/track" element={<TrackOrders />} />
          <Route path="/paypal/success" element={<PayPalSuccess />} />
          <Route path="/paypal/cancel" element={<PayPalCancel />} />
          <Route path="/shipping-policy" element={<ShippingPage />} />
          <Route path="/refund-policy" element={<RefundPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;