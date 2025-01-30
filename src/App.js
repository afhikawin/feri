import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Selamat datang di Website Sederhana!</h1>
        <p>Ini adalah website pertama saya dengan React!</p>
        <button onClick={() => alert('Halo!')}>Klik Saya!</button>
      </header>
    </div>
  );
}

export default App;
