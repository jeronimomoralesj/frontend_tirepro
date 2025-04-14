'use client';

import React, { useState } from 'react';
import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const [userName, setUserName] = useState('');
  
  const handleMailClick = () => {
    const subject = encodeURIComponent('Solicitud de eliminación de cuenta');
    const body = encodeURIComponent(`Hola,\n\nMe gustaría solicitar la eliminación de mi cuenta.\n\Email: ${userName}\n\nSaludos,`);
    window.location.href = `mailto:jeronimo.morales@cesa.edu.co?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center text-red-500 mb-6">
          <AlertTriangle size={48} />
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Eliminar Cuenta
        </h1>
        
        <div className="space-y-4 text-gray-600">
          <p>
            Estás solicitando eliminar tu cuenta. Esta acción es permanente y no se puede deshacer.
          </p>
          
          <p>
            Todos tus datos serán eliminados de nuestros sistemas y no podrás recuperar tu información después de completar este proceso.
          </p>
          
          <div className="mt-6">
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
              Tu nombre completo:
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Escribe tu nombre aquí"
            />
          </div>
          
          <button
            onClick={handleMailClick}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
          >
            <Mail size={20} />
            <span>Solicitar eliminación de cuenta</span>
          </button>
          
          <Link href="/" className="mt-4 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft size={16} />
            <span>Regresar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}