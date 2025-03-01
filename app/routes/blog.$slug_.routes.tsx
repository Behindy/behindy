import { Outlet } from "@remix-run/react";
import MainLayout from "../components/layout/MainLayout";

export default function BlogSlugLayout() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <Outlet />
      </div>
    </MainLayout>
  );
}