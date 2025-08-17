package data

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"go-server/internal/models"
)

// setupTestRepo creates a clean test repository with temporary data directory
func setupTestRepo(t *testing.T) (*Repository, string) {
	// Create temporary directory for test data
	tempDir, err := ioutil.TempDir("", "test_repo_*")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}

	// Create a new repository instance for testing
	repo := &Repository{
		users:           make(map[int]models.User),
		shaders:         make(map[int]models.Shader),
		tags:            make(map[int]models.Tag),
		usersByUsername: make(map[string]*models.User),
		shadersByUser:   make(map[int][]int),
		shadersByTag:    make(map[string][]int),
		nextUserID:      1,
		nextShaderID:    1,
		nextTagID:       1,
	}

	// Add some test users and tags
	repo.users[1] = models.User{ID: 1, Username: "testuser", Password: "password"}
	repo.users[2] = models.User{ID: 2, Username: "admin", Password: "admin"}
	repo.nextUserID = 3

	repo.tags[1] = models.Tag{ID: 1, Name: "fragment"}
	repo.tags[2] = models.Tag{ID: 2, Name: "vertex"}
	repo.tags[3] = models.Tag{ID: 3, Name: "compute"}
	repo.nextTagID = 4

	repo.buildIndexes()

	return repo, tempDir
}

// cleanupTestRepo removes the temporary test directory
func cleanupTestRepo(tempDir string) {
	os.RemoveAll(tempDir)
}

// saveTestShaders saves shaders to the test directory
func (r *Repository) saveTestShaders(testDir string) error {
	shaders := make([]models.Shader, 0, len(r.shaders))
	for _, shader := range r.shaders {
		shaders = append(shaders, shader)
	}

	data, err := json.MarshalIndent(shaders, "", "  ")
	if err != nil {
		return err
	}

	path := filepath.Join(testDir, "shaders.json")
	return ioutil.WriteFile(path, data, 0644)
}

func TestCreateShader_Success(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create a test shader
	shader := models.Shader{
		UserID: 1,
		Name:   "Test Fragment Shader",
		ShaderScripts: []models.ShaderScript{
			{
				ID:   1,
				Code: "precision mediump float;\nvoid main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}",
			},
		},
		Tags: []models.Tag{
			{ID: 1, Name: "fragment"},
		},
	}

	// Test CreateShader
	createdShader, err := repo.CreateShader(shader)

	// Assertions
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if createdShader == nil {
		t.Fatal("Expected created shader to not be nil")
	}

	// Check that ID was assigned
	if createdShader.ID == 0 {
		t.Error("Expected shader ID to be assigned")
	}

	// Check that the shader was stored in the repository
	storedShader := repo.GetShaderByID(createdShader.ID)
	if storedShader == nil {
		t.Fatal("Expected shader to be stored in repository")
	}

	// Verify all fields match
	if storedShader.Name != shader.Name {
		t.Errorf("Expected name %q, got %q", shader.Name, storedShader.Name)
	}

	if storedShader.UserID != shader.UserID {
		t.Errorf("Expected UserID %d, got %d", shader.UserID, storedShader.UserID)
	}

	if len(storedShader.ShaderScripts) != len(shader.ShaderScripts) {
		t.Errorf("Expected %d shader scripts, got %d", len(shader.ShaderScripts), len(storedShader.ShaderScripts))
	}

	if len(storedShader.Tags) != len(shader.Tags) {
		t.Errorf("Expected %d tags, got %d", len(shader.Tags), len(storedShader.Tags))
	}

	// Check that indexes were updated
	userShaders := repo.shadersByUser[1]
	found := false
	for _, id := range userShaders {
		if id == createdShader.ID {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected shader to be indexed by user ID")
	}

	// Check tag indexing
	tagShaders := repo.shadersByTag["fragment"]
	found = false
	for _, id := range tagShaders {
		if id == createdShader.ID {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected shader to be indexed by tag")
	}
}

func TestCreateShader_AutoIncrementID(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create multiple shaders to test auto-increment
	shader1 := models.Shader{
		UserID: 1,
		Name:   "First Shader",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "// First shader code"},
		},
	}

	shader2 := models.Shader{
		UserID: 1,
		Name:   "Second Shader",
		ShaderScripts: []models.ShaderScript{
			{ID: 2, Code: "// Second shader code"},
		},
	}

	created1, err1 := repo.CreateShader(shader1)
	created2, err2 := repo.CreateShader(shader2)

	// Check both were created successfully
	if err1 != nil || err2 != nil {
		t.Fatalf("Expected no errors, got: %v, %v", err1, err2)
	}

	// Check that IDs are auto-incremented
	if created1.ID >= created2.ID {
		t.Errorf("Expected second shader ID (%d) to be greater than first (%d)", created2.ID, created1.ID)
	}

	// Verify both are stored
	if repo.GetShaderByID(created1.ID) == nil {
		t.Error("First shader not found in repository")
	}

	if repo.GetShaderByID(created2.ID) == nil {
		t.Error("Second shader not found in repository")
	}
}

func TestCreateShader_EmptyName(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create shader with empty name (should still work)
	shader := models.Shader{
		UserID: 1,
		Name:   "",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "// Test code"},
		},
	}

	created, err := repo.CreateShader(shader)

	if err != nil {
		t.Fatalf("Expected no error for empty name, got: %v", err)
	}

	if created.Name != "" {
		t.Errorf("Expected empty name to be preserved, got %q", created.Name)
	}
}

func TestCreateShader_NoTags(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create shader with no tags
	shader := models.Shader{
		UserID: 1,
		Name:   "Shader Without Tags",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "// Test code"},
		},
		Tags: []models.Tag{},
	}

	created, err := repo.CreateShader(shader)

	if err != nil {
		t.Fatalf("Expected no error for shader without tags, got: %v", err)
	}

	if len(created.Tags) != 0 {
		t.Errorf("Expected 0 tags, got %d", len(created.Tags))
	}
}

func TestCreateShader_MultipleTags(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create shader with multiple tags
	shader := models.Shader{
		UserID: 1,
		Name:   "Multi-Tag Shader",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "// Test code"},
		},
		Tags: []models.Tag{
			{ID: 1, Name: "fragment"},
			{ID: 2, Name: "vertex"},
			{ID: 3, Name: "compute"},
		},
	}

	created, err := repo.CreateShader(shader)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Verify all tags are preserved
	if len(created.Tags) != 3 {
		t.Errorf("Expected 3 tags, got %d", len(created.Tags))
	}

	// Check that shader is indexed under all tags
	expectedTags := []string{"fragment", "vertex", "compute"}
	for _, tagName := range expectedTags {
		tagShaders := repo.shadersByTag[tagName]
		found := false
		for _, id := range tagShaders {
			if id == created.ID {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected shader to be indexed under tag %q", tagName)
		}
	}
}

func TestCreateShader_InvalidUserID(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Create shader with non-existent user ID (should still work, validation might be handled elsewhere)
	shader := models.Shader{
		UserID: 999, // Non-existent user
		Name:   "Orphaned Shader",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "// Test code"},
		},
	}

	created, err := repo.CreateShader(shader)

	// The repository doesn't validate user existence in CreateShader
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if created.UserID != 999 {
		t.Errorf("Expected UserID 999, got %d", created.UserID)
	}
}

func TestCreateShader_ConcurrentAccess(t *testing.T) {
	repo, tempDir := setupTestRepo(t)
	defer cleanupTestRepo(tempDir)

	// Test concurrent creation (basic test)
	done := make(chan bool, 2)
	var shader1, shader2 *models.Shader
	var err1, err2 error

	go func() {
		shader1, err1 = repo.CreateShader(models.Shader{
			UserID: 1,
			Name:   "Concurrent Shader 1",
			ShaderScripts: []models.ShaderScript{{ID: 1, Code: "// Code 1"}},
		})
		done <- true
	}()

	go func() {
		shader2, err2 = repo.CreateShader(models.Shader{
			UserID: 1,
			Name:   "Concurrent Shader 2",
			ShaderScripts: []models.ShaderScript{{ID: 2, Code: "// Code 2"}},
		})
		done <- true
	}()

	// Wait for both goroutines to complete
	<-done
	<-done

	// Check both succeeded
	if err1 != nil || err2 != nil {
		t.Fatalf("Expected no errors, got: %v, %v", err1, err2)
	}

	// Check both have unique IDs
	if shader1.ID == shader2.ID {
		t.Error("Expected unique IDs for concurrent shader creation")
	}

	// Check both are stored
	if repo.GetShaderByID(shader1.ID) == nil || repo.GetShaderByID(shader2.ID) == nil {
		t.Error("Expected both shaders to be stored")
	}
}

// Benchmark test for CreateShader performance
func BenchmarkCreateShader(b *testing.B) {
	repo, tempDir := setupTestRepo(&testing.T{})
	defer cleanupTestRepo(tempDir)

	shader := models.Shader{
		UserID: 1,
		Name:   "Benchmark Shader",
		ShaderScripts: []models.ShaderScript{
			{ID: 1, Code: "precision mediump float;\nvoid main() { gl_FragColor = vec4(1.0); }"},
		},
		Tags: []models.Tag{{ID: 1, Name: "fragment"}},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Reset the shader ID for each iteration
		shader.ID = 0
		_, err := repo.CreateShader(shader)
		if err != nil {
			b.Fatalf("Unexpected error: %v", err)
		}
	}
}