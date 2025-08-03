// src/components/Auth/LoginForm.tsx
import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuthStore } from '../../store/authStore';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <Container>
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div style={{ fontSize: '3rem' }} className="mb-3">💬</div>
                  <h1 className="h2 fw-bold text-dark">Chat App</h1>
                  <p className="text-muted">Sign in to continue</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      size="lg"
                      className="border-2"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      size="lg"
                      className="border-2"
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-100 mb-3"
                    size="lg"
                    style={{
                      background: isLoading 
                        ? '#6c757d' 
                        : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      border: 'none'
                    }}
                  >
                    {isLoading ? '🔄 Signing In...' : 'Sign In'}
                  </Button>

                  {error && (
                    <Alert variant="danger" className="text-center">
                      ❌ {error}
                    </Alert>
                  )}
                </Form>

                <div className="text-center">
                  <p className="text-muted mb-0">
                    Don't have an account?{' '}
                    <Button
                      variant="link"
                      onClick={onSwitchToRegister}
                      className="p-0 fw-semibold text-decoration-none"
                      style={{ color: '#667eea' }}
                    >
                      Sign up
                    </Button>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};