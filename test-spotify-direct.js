// Test directo con Spotify API para verificar preview URLs
// Ejecutar en consola del navegador

async function testSpotifyDirect() {
    console.log('🔍 Verificando preview URLs directamente con Spotify...');
    
    // Álbumes de prueba con diferentes años y géneros
    const testAlbums = [
        { id: '4aawyAB9vmqN3uQ7FjRGTy', name: 'Global Warming - Pitbull (2012)' },
        { id: '1DFixLWuPkv3KT3TnV35m3', name: 'Evolve - Imagine Dragons (2017)' },
        { id: '2noRn2Aes5aoNVsU6iWThc', name: 'Future Nostalgia - Dua Lipa (2020)' },
        { id: '5EuKBNjwjjhqJAQqm6avdd', name: 'Álbum Original' },
        { id: '4yP0hdKOZPNshxUOjY0cZj', name: 'Adele - 25 (2015)' },
        { id: '7txGsnDSqVMoRl6RQ9XyZP', name: 'Harry Styles - Fine Line (2019)' },
        { id: '0ETFjACtuP2ADo6LFhL6HN', name: 'Bruno Mars - 24K Magic (2016)' }
    ];
    
    console.log('📊 Probando', testAlbums.length, 'álbumes...\n');
    
    let albumsWithPreviews = 0;
    let totalTracks = 0;
    let tracksWithPreviews = 0;
    
    for (const album of testAlbums) {
        try {
            console.log('🎵 Probando:', album.name);
            
            const response = await fetch(`/album/${album.id}/tracks`, { 
                credentials: 'include' 
            });
            
            if (response.ok) {
                const data = await response.json();
                totalTracks += data.totalTracks || 0;
                tracksWithPreviews += data.tracksWithPreviewCount || 0;
                
                if (data.hasPreview) {
                    albumsWithPreviews++;
                    console.log('✅', album.name + ':', data.tracksWithPreviewCount, 'previews de', data.totalTracks, 'tracks');
                } else {
                    console.log('❌', album.name + ':', 'Sin previews');
                }
            } else {
                console.log('⚠️', album.name + ':', 'Error', response.status);
            }
            
            // Pequeña pausa para no saturar la API
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log('❌', album.name + ':', 'Error -', error.message);
        }
    }
    
    console.log('\n📈 RESUMEN FINAL:');
    console.log('- Álbumes con previews:', albumsWithPreviews, 'de', testAlbums.length);
    console.log('- Total tracks analizados:', totalTracks);
    console.log('- Tracks con preview:', tracksWithPreviews);
    console.log('- Porcentaje de previews:', Math.round((tracksWithPreviews / totalTracks) * 100) + '%');
    
    if (albumsWithPreviews === 0) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO:');
        console.log('Spotify ya no proporciona preview URLs para estos álbumes populares.');
        console.log('Esto es un cambio en las políticas de Spotify, no un error del código.');
        console.log('\n💡 SOLUCIONES POSIBLES:');
        console.log('1. Buscar álbumes más antiguos (2010-2015) que aún tengan previews');
        console.log('2. Usar álbumes de artistas independientes');
        console.log('3. Implementar mensaje informativo para usuarios');
        console.log('4. Considerar API alternativa (YouTube, SoundCloud, etc.)');
    }
    
    return {
        albumsWithPreviews,
        totalAlbums: testAlbums.length,
        totalTracks,
        tracksWithPreviews,
        previewPercentage: Math.round((tracksWithPreviews / totalTracks) * 100)
    };
}

// Ejecutar test
testSpotifyDirect();