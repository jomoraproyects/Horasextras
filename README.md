# Registro de Horas Extras

Software web para registrar cada cédula una sola vez y agregarle varios conceptos y horas por periodo. Consolida los registros y descarga un archivo `.xlsx` con las columnas requeridas por nómina.

Los conceptos de simple disponibilidad 236, 237, 238 y 239 asignan automáticamente 3 horas y mantienen ese valor fijo.

Incluye un apartado plegable de **Personal** con el directorio de trabajadores incorporado en la aplicación. Permite buscar por nombre o cédula, consultar el cargo y agregar a la persona seleccionada a las novedades. Los nombres y cargos no se incluyen en el archivo final de nómina.

## Uso local

Ejecute `Abrir_aplicacion.bat` o abra `dist/index.html` en un navegador moderno. No necesita instalar dependencias ni mantener un servidor encendido. Las novedades diligenciadas se guardan únicamente en el almacenamiento local del navegador.

## Despliegue futuro en un VPS

El contenido de la carpeta `dist` es estático. Para publicarlo, copie esa carpeta al directorio público de Nginx, Apache, Caddy o cualquier servicio compatible con archivos HTML, CSS y JavaScript. No necesita base de datos ni un proceso de Python o Node en el servidor.

## Formato generado

`IDENTIFICACION`, `CODCONCEPTO`, `FECHA_PRO_INI`, `FECHA_PRO_FIN`, `NROHORAS`, `AÑO`, `MES`.

La columna `NROHORAS` se exporta como número real de Excel y admite hasta dos decimales con punto. El formulario acepta tanto `14.5` como `14,5` y los normaliza a `14.5`. Las horas enteras se muestran sin decimales, por ejemplo `21`.
