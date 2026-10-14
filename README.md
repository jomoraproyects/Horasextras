# Registro de Horas Extras

Software web para registrar cada cédula una sola vez y agregarle varios conceptos y horas por periodo. Consolida los registros y descarga un archivo `.xlsx` con las columnas requeridas por nómina.

Incluye un apartado plegable de **Personal** para importar la primera hoja de un archivo Excel o CSV con las columnas `NOMBRE` e `IDENTIFICACION`, buscar trabajadores, agregarlos a las novedades y retirarlos del directorio con confirmación. El directorio se guarda solamente en el navegador y los nombres no se incluyen en el archivo final de nómina.

## Uso local

Ejecute `Abrir_aplicacion.bat` o abra `dist/index.html` en un navegador moderno. No necesita instalar dependencias ni mantener un servidor encendido. La información se guarda únicamente en el almacenamiento local del navegador.

## Despliegue futuro en un VPS

El contenido de la carpeta `dist` es estático. Para publicarlo, copie esa carpeta al directorio público de Nginx, Apache, Caddy o cualquier servicio compatible con archivos HTML, CSS y JavaScript. No necesita base de datos ni un proceso de Python o Node en el servidor.

## Formato generado

`IDENTIFICACION`, `CODCONCEPTO`, `FECHA_PRO_INI`, `FECHA_PRO_FIN`, `NROHORAS`, `AÑO`, `MES`.
