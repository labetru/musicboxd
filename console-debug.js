// Debug script para ejecutar en la consola del navegador
// Copia y pega este código en la consola de DevTools

async function debugAudioPreview(albumId = '5EuKBNjwjjhqJAQqm6avdd') {
    console.log('🔧 Iniciando debug de AudioPreviewPlayer...');
    console.log('Album ID:', albumId);
    
    try {
        // Test 1: Probar endpoint de tracks
        console.log('\n📡 Probando endpoint /album/' + albumId + '/tracks...');
        
        const response = await fetch(`/album/${albumId}/tracks`, {
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            console.log('\n✅ API Response exitosa:');
            console.log('- Total tracks:', data.totalTracks || 0);
            console.log('- Tracks con preview:', data.tracksWithPreviewCount || 0);
            console.log('- Tiene preview:', data.hasPreview ? 'SÍ' : 'NO');
            console.log('- Tiempo procesamiento:', data.processingTime || 0, 'ms');
            
            if (data.tracks && data.tracks.length > 0) {
                console.log('\n🎵 Detalles de tracks:');
                data.tracks.forEach((track, i) => {
                    console.log(`${i+1}. ${track.name} - Preview: ${track.available ? '✅' : '❌'}`);
                    if (track.available) {
                        console.log(`   URL: ${track.preview_url}`);
                    }
                });
            }
            
            // Test 2: Si hay tracks disponibles, probar AudioPreviewPlayer
            if (data.hasPreview) {
                console.log('\n🎮 Probando AudioPreviewPlayer...');
                
                // Buscar si ya existe un contenedor
                let container = document.getElementById('audioPreviewContainer');
                if (!container) {
                    console.log('Creando contenedor temporal...');
                    container = document.createElement('div');
                    container.id = 'audioPreviewContainer';
                    document.body.appendChild(container);
                }
                
                // Crear instancia del reproductor
                if (window.AudioPreviewPlayer) {
                    const player = new AudioPreviewPlayer('audioPreviewContainer', albumId);
                    await player.initialize();
                    console.log('✅ AudioPreviewPlayer inicializado correctamente');
                    
                    // Probar carga de tracks
                    await player.loadTracks();
                    console.log('✅ Tracks cargados correctamente');
                    console.log('Tracks en player:', player.tracks.length);
                    
                    // Probar selección de track
                    const selectedTrack = player.selectRandomTrack();
                    if (selectedTrack) {
                        console.log('✅ Track seleccionado:', selectedTrack.name);
                        console.log('Preview URL:', selectedTrack.preview_url);
                    } else {
                        console.log('❌ No se pudo seleccionar track');
                    }
                    
                } else {
                    console.log('❌ AudioPreviewPlayer no está disponible');
                }
            } else {
                console.log('\n❌ No hay tracks con preview disponible para probar reproductor');
            }
            
        } else {
            console.log('\n❌ Error en API:', data);
        }
        
    } catch (error) {
        console.log('\n❌ Error en debug:', error);
    }
    
    console.log('\n🏁 Debug completado');
}

// Ejecutar debug automáticamente
debugAudioPreview();

console.log('📋 Para ejecutar manualmente: debugAudioPreview("ALBUM_ID")');