import { useEffect, useState } from "react";
import { Navigate, Outlet, useRoutes } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { request } from "./lib/request";
import ArticleDetail from "./pages/ArticleDetail";
import Articles from "./pages/Articles";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Sessions from "./pages/Sessions";
import Websites from "./pages/Websites";

function RequireAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    request("/auth/me")
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;
  return authenticated ? <Outlet /> : <Navigate to="/" replace />;
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Login />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/articles",
        element: <Articles />,
      },
      {
        path: "/articles/:id",
        element: <ArticleDetail />,
      },
      {
        path: "/sessions",
        element: <Sessions />,
      },
      {
        path: "/websites",
        element: <Websites />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

export default function AppRoutes() {
  return useRoutes(routes);
}
