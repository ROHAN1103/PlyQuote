import { useState } from "react";
import { RouterProvider } from "react-router/dom";
import { createRouter } from "./router";
import { Providers } from "./providers";

export default function App() {
  const [router] = useState(createRouter);
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
