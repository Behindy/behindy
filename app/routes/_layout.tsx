import { Outlet } from "@remix-run/react";
import MainLayout from "../components/layout/MainLayout";

export default function Layout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}