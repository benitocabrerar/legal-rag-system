'use client';

import { useState, useEffect } from 'react';

interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt: string | null;
}

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export default function SettingsPage() {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [disableMode, setDisableMode] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/2fa/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorStatus(data);
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setError('');
    setProcessingAction(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        setSetupMode(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al configurar 2FA');
      }
    } catch (error) {
      console.error('Error starting 2FA setup:', error);
      setError('Error al configurar autenticación de dos factores');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProcessingAction(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backupCodes || []);
        setSuccess('¡Autenticación de dos factores habilitada exitosamente!');
        setSetupMode(false);
        setVerificationToken('');
        loadTwoFactorStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Código de verificación inválido');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError('Error al verificar el código');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProcessingAction(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          token: verificationToken,
        }),
      });

      if (response.ok) {
        setSuccess('Autenticación de dos factores deshabilitada');
        setDisableMode(false);
        setPassword('');
        setVerificationToken('');
        loadTwoFactorStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al deshabilitar 2FA');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setError('Error al deshabilitar autenticación de dos factores');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupMode(false);
    setSetupData(null);
    setVerificationToken('');
    setError('');
  };

  const handleCancelDisable = () => {
    setDisableMode(false);
    setPassword('');
    setVerificationToken('');
    setError('');
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setSuccess('Códigos de respaldo copiados al portapapeles');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Configuración de Seguridad</h1>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Backup Codes Display */}
      {backupCodes.length > 0 && (
        <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Códigos de Respaldo
              </h3>
              <p className="text-sm text-gray-600">
                Guarda estos códigos en un lugar seguro. Puedes usarlos si pierdes acceso a tu dispositivo de autenticación.
              </p>
            </div>
            <button
              onClick={copyBackupCodes}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              Copiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-white p-4 rounded border border-yellow-300">
            {backupCodes.map((code, index) => (
              <div key={index} className="text-gray-800">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => setBackupCodes([])}
            className="mt-4 text-sm text-gray-600 hover:text-gray-800"
          >
            He guardado mis códigos de forma segura
          </button>
        </div>
      )}

      {/* Two-Factor Authentication Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Autenticación de Dos Factores (2FA)
            </h2>
            <p className="text-sm text-gray-600">
              Añade una capa adicional de seguridad a tu cuenta utilizando Google Authenticator o una aplicación similar.
            </p>
          </div>
          <div className="flex items-center">
            {twoFactorStatus?.enabled ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Habilitado
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                Deshabilitado
              </span>
            )}
          </div>
        </div>

        {!setupMode && !disableMode && (
          <div className="mt-6">
            {twoFactorStatus?.enabled ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Tu cuenta está protegida con autenticación de dos factores desde{' '}
                  {twoFactorStatus.verifiedAt
                    ? new Date(twoFactorStatus.verifiedAt).toLocaleDateString('es-EC')
                    : 'la configuración inicial'}
                </p>
                <button
                  onClick={() => setDisableMode(true)}
                  disabled={processingAction}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  Deshabilitar 2FA
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartSetup}
                disabled={processingAction}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {processingAction ? 'Configurando...' : 'Configurar 2FA'}
              </button>
            )}
          </div>
        )}

        {/* Setup Mode */}
        {setupMode && setupData && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Paso 1: Escanea el código QR
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Usa Google Authenticator o una aplicación similar para escanear este código QR:
            </p>
            <div className="flex justify-center mb-6">
              <img
                src={setupData.qrCode}
                alt="QR Code"
                className="border-4 border-gray-200 rounded-lg"
              />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Paso 2: Ingresa el código de verificación
            </h3>
            <form onSubmit={handleVerifyAndEnable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg text-center"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleCancelSetup}
                  disabled={processingAction}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingAction || verificationToken.length !== 6}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {processingAction ? 'Verificando...' : 'Verificar y Habilitar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Disable Mode */}
        {disableMode && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deshabilitar Autenticación de Dos Factores
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Para deshabilitar 2FA, ingresa tu contraseña y un código de verificación actual.
            </p>
            <form onSubmit={handleDisable2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg text-center"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleCancelDisable}
                  disabled={processingAction}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !password || verificationToken.length !== 6}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {processingAction ? 'Deshabilitando...' : 'Deshabilitar 2FA'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
