import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import FileManager from './pages/FileManager';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <FileManager />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Suspense>
    </Router>
  );
}

export default App;