import React from 'react';
import ReactDOM from 'react-dom/client';
import UserApp from './UserApp.jsx';
import AdminApp from './AdminApp.jsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// CHECK URL: If ?messenger=123 exists, load Admin. Otherwise, load User.
const params = new URLSearchParams(window.location.search);
const isMessenger = params.get('messenger') === '123' || params.get('messenger') === 'true';

if (isMessenger) {
  root.render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <UserApp />
    </React.StrictMode>
  );
}


