# Requirements Document

## Introduction

Esta especificación define la mejora del carousel de álbumes principales para limitar la visualización a los 20 álbumes mejor rankeados, similar al comportamiento de las otras secciones de la aplicación (álbumes con más reseñas y reseñas destacadas).

## Glossary

- **Carousel**: Componente de interfaz horizontal deslizable que muestra álbumes en la página principal
- **Sistema**: La aplicación web MusicBoxd
- **Álbum mejor rankeado**: Álbum ordenado por promedio de estrellas (avgStars) y cantidad de reseñas (reviewCount)
- **Endpoint**: Ruta de API del servidor que proporciona datos

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero que el carousel muestre solo los 20 álbumes mejor rankeados, para que la experiencia sea consistente con otras secciones y el rendimiento sea óptimo.

#### Acceptance Criteria

1. WHEN el sistema carga el carousel de álbumes principales THEN el sistema SHALL limitar la respuesta a máximo 20 álbumes
2. WHEN el sistema ordena los álbumes para el carousel THEN el sistema SHALL ordenar por promedio de estrellas descendente y cantidad de reseñas descendente
3. WHEN el carousel recibe los datos del servidor THEN el sistema SHALL mostrar solo los álbumes recibidos sin procesamiento adicional del lado cliente
4. WHEN no hay suficientes álbumes con reseñas THEN el sistema SHALL mostrar todos los álbumes disponibles hasta el límite de 20
5. WHEN el endpoint es consultado THEN el sistema SHALL mantener la misma estructura de respuesta JSON existente