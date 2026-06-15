import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Shared/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import N8nAnalyze from './pages/N8nAnalyze'
import ErrorHelper from './pages/ErrorHelper'
import Glossary from './pages/Glossary'
import AnalysisDetail from './pages/AnalysisDetail'
import ErrorDetail from './pages/ErrorDetail'
import InterviewMode from './pages/InterviewMode'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/glossary" element={<Glossary />} />

        <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analyze"        element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
        <Route path="/n8n"            element={<ProtectedRoute><N8nAnalyze /></ProtectedRoute>} />
        <Route path="/errors"         element={<ProtectedRoute><ErrorHelper /></ProtectedRoute>} />
        <Route path="/errors/:id"     element={<ProtectedRoute><ErrorDetail /></ProtectedRoute>} />
        <Route path="/history/:id"    element={<ProtectedRoute><AnalysisDetail /></ProtectedRoute>} />
        <Route path="/interview/:id"  element={<ProtectedRoute><InterviewMode /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
