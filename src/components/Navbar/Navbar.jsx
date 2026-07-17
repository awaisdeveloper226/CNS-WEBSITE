import { Home, Search, Plus, Users, User } from "lucide-react";
import "./Navbar.css";

export default function NavBar({ active, onChange }) {
  return (
    <nav className="navbar">
      <button
        className={`nav-item ${active === "home" ? "active" : ""}`}
        onClick={() => onChange("home")}
      >
        <Home size={22} color={active === "home" ? "#2563eb" : "#999"} />
        <span className="nav-label">Home</span>
      </button>

      <button
        className={`nav-item ${active === "search" ? "active" : ""}`}
        onClick={() => onChange("search")}
      >
        <Search size={22} color={active === "search" ? "#2563eb" : "#999"} />
        <span className="nav-label">Search</span>
      </button>

      {/* <button className="nav-add" onClick={() => onChange("add")} aria-label="Add contribution">
        <Plus size={28} color="#fff" />
      </button> */}

      <button
        className={`nav-item ${active === "community" ? "active" : ""}`}
        onClick={() => onChange("community")}
      >
        <Users size={22} color={active === "community" ? "#2563eb" : "#999"} />
        <span className="nav-label">Community</span>
      </button>

      <button
        className={`nav-item ${active === "profile" ? "active" : ""}`}
        onClick={() => onChange("profile")}
      >
        <User size={22} color={active === "profile" ? "#2563eb" : "#999"} />
        <span className="nav-label">Profile</span>
      </button>
    </nav>
  );
}