import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./route";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
