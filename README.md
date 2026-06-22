# Mini CRM

Mini CRM es una aplicacion web sencilla para gestionar leads. Permite crear, listar, buscar, filtrar, editar, eliminar y exportar leads en formato CSV desde una interfaz web servida por Express.

La aplicacion guarda la informacion en una base de datos SQLite local, por lo que los leads persisten entre reinicios del servidor.

## Tecnologias utilizadas

- Node.js
- Express
- SQLite
- better-sqlite3
- HTML
- CSS
- JavaScript del lado del cliente

## Requisitos previos

Antes de instalar el proyecto, asegurate de tener instalado:

- Node.js
- npm

## Instalacion

1. Clona o descarga este repositorio.
2. Entra en la carpeta del proyecto:

```bash
cd "mini-crm Codex"
```

3. Instala las dependencias:

```bash
npm install
```

## Ejecucion local

Para ejecutar la aplicacion en modo desarrollo:

```bash
npm run dev
```

Para ejecutarla en modo normal:

```bash
npm start
```

Por defecto, la aplicacion se abre en:

```text
http://localhost:3000
```

Tambien puedes cambiar el puerto usando la variable de entorno `PORT`:

```bash
PORT=4000 npm start
```

## Funcionalidades principales

- Crear leads con nombre, email, fuente y estado.
- Editar leads existentes.
- Eliminar leads.
- Buscar leads por nombre o email.
- Filtrar leads por estado.
- Ver estadisticas rapidas por estado.
- Exportar todos los leads a CSV.
- Persistir los datos en SQLite.

## API disponible

La interfaz web consume estos endpoints:

- `GET /`: muestra la aplicacion web.
- `GET /status`: comprueba que la API esta funcionando.
- `GET /leads`: devuelve todos los leads.
- `POST /leads`: crea un nuevo lead.
- `PATCH /leads/:id`: actualiza un lead existente.
- `DELETE /leads/:id`: elimina un lead.
- `GET /leads/export.csv`: descarga los leads en formato CSV.

## Estructura del proyecto

```text
.
├── database/
│   └── mini-crm.sqlite
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── src/
│   ├── app.js
│   ├── server.js
│   └── data/
│       └── leadsStore.js
├── package.json
├── package-lock.json
└── README.md
```

### Carpetas y archivos importantes

- `public/`: contiene la interfaz web estatica.
- `src/server.js`: arranca el servidor Express.
- `src/app.js`: configura la aplicacion Express, rutas, API y archivos estaticos.
- `src/data/leadsStore.js`: gestiona la conexion y operaciones sobre SQLite.
- `database/mini-crm.sqlite`: base de datos local donde se guardan los leads.
- `package.json`: define dependencias y scripts del proyecto.

## Base de datos

La carpeta `database/` y la tabla `leads` se preparan automaticamente al iniciar la aplicacion. Si el archivo `database/mini-crm.sqlite` no existe, se crea durante el arranque.
