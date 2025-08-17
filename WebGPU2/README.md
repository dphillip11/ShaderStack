# Go Server

This project is a basic Go server that demonstrates how to set up API and web routes. It includes handlers for both types of routes and serves a simple HTML page.

## Project Structure

```
go-server
├── cmd
│   └── server
│       └── main.go        # Entry point of the application
├── internal
│   ├── handlers
│   │   ├── api.go        # API route handlers
│   │   └── web.go        # Web route handlers
│   └── models
│       └── types.go      # Data structures used in the application
├── static
│   ├── css
│   │   └── style.css      # CSS styles for the web application
│   └── js
│       └── app.js         # JavaScript code for client-side functionality
├── templates
│   └── index.html         # HTML template served by the web handler
├── go.mod                 # Module definition and dependencies
├── go.sum                 # Checksums for module dependencies
└── README.md              # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd go-server
   ```

2. **Install dependencies:**
   ```
   go mod tidy
   ```

3. **Run the server:**
   ```
   go run cmd/server/main.go
   ```

4. **Access the application:**
   Open your web browser and navigate to `http://localhost:8080` to view the web page. You can also interact with the API at `http://localhost:8080/api/items`.

## Usage

- **API Endpoints:**
  - `GET /api/items` - Retrieve a list of items.
  - `POST /api/items` - Create a new item.

- **Web Routes:**
  - `GET /` - Serve the index.html page.

## License

This project is licensed under the MIT License.