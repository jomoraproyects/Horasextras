# Registro de Horas Extras

Aplicación web estática para registrar cédula, concepto y horas por periodo. Consolida filas repetidas y descarga un archivo `.xlsx` con las columnas requeridas por nómina.

## Uso local

Ejecute `Abrir_aplicacion.bat` o abra `dist/index.html` en un navegador moderno. No necesita instalar dependencias ni mantener un servidor encendido. La información se guarda únicamente en el almacenamiento local del navegador.

## Despliegue futuro en un VPS

El contenido de la carpeta `dist` es estático. Para publicarlo, copie esa carpeta al directorio público de Nginx, Apache, Caddy o cualquier servicio compatible con archivos HTML, CSS y JavaScript. No necesita base de datos ni un proceso de Python o Node en el servidor.

## Formato generado

`IDENTIFICACION`, `CODCONCEPTO`, `FECHA_PRO_INI`, `FECHA_PRO_FIN`, `NROHORAS`, `AÑO`, `MES`.
