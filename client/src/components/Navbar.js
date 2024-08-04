import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/register">Registro</Link>
        </li>
        <li>
          <Link to="/login">Inicio de Sesión</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
