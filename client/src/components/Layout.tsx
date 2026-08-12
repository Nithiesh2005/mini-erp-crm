import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Mini ERP + CRM</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/challans">Challans</NavLink>
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div />
          <div className="user">
            <span>
              {user?.name} · <b>{user?.role}</b>
            </span>
            <button className="secondary" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
