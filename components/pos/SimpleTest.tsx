"use client";

import { useState, useEffect } from 'react';

export function SimpleTest() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    const testAuth = async () => {
      try {
        const response = await fetch('/api/auth/get-session');
        const data = await response.json();
        setMessage(`Session: ${data.user?.name || 'No user'} (${data.user?.id || 'No ID'})`);
      } catch (error) {
        setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    testAuth();
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold mb-2">Auth Test:</h3>
      <p className="text-sm">{message}</p>
    </div>
  );
}