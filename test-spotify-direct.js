// Test directo para verificar qué devuelve Spotify API
// Ejecutar en el servidor con: node test-spotify-direct.js

import fetch from 'node-fetch';
import { config } from './server/config.js';

const CLIENT_ID = config.spotify.clientId;
const CLIENT_SECRET = config.spotify.clientSecret;

async function getToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

async function testSpotifyAPI() {
  console.log('🔧 Probando Spotify API directamente...');
  
  try {
    const token = await getToken();
    console.log('✅ Token obtenido:', token ? 'SÍ' : 'NO');
    
    // Probar con diferentes álbumes
    const albumIds = [
      '5EuKBNjwjjhqJAQqm6avdd', // Álbum original
      '4aawyAB9vmqN3uQ7FjRGTy', // Pitbull - Global Warming
      '1DFixLWuPkv3KT3TnV35m3', // Imagine Dragons - Evolve
      '2noRn2Aes5aoNVsU6iWThc'  // Dua Lipa - Future Nostalgia
    ];
    
    for (const albumId of albumIds) {
      console.log(`\n📀 Probando álbum: ${albumId}`);
      
      const response = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Respuesta OK - ${data.items.length} tracks`);
        
        let tracksWithPreview = 0;
        data.items.forEach((track, i) => {
          if (track.preview_url) {
            tracksWithPreview++;
            console.log(`  ${i+1}. ${track.name} - ✅ Preview: ${track.preview_url}`);
          } else {
            console.log(`  ${i+1}. ${track.name} - ❌ Sin preview`);
          }
        });
        
        console.log(`📊 Resumen: ${tracksWithPreview}/${data.items.length} tracks con preview`);
      } else {
        console.log(`❌ Error ${response.status}: ${response.statusText}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSpotifyAPI();