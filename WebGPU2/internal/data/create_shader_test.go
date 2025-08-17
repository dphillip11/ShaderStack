package data

import (
	"fmt"
	"os"
	"testing"

	"go-server/internal/models"
)

func TestCreateShader(t *testing.T) {
	// Setup: Create a fresh repository for testing
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

	// Create test user
	testUser := models.User{
		ID:       1,
		Username: "testuser",
		Password: "testpass",
	}
	repo.users[1] = testUser

	// Create test tag
	testTag := models.Tag{
		ID:   1,
		Name: "fragment",
	}
	repo.tags[1] = testTag

	// Test case 1: Create a basic shader
	t.Run("CreateBasicShader", func(t *testing.T) {
		shader := models.Shader{
			UserID: 1,
			Name:   "Test Shader",
			Author: "Test Author",
			ShaderScripts: []models.ShaderScript{
				{
					ID:   1,
					Code: "precision mediump float;\nvoid main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
				},
			},
			Tags: []models.Tag{testTag},
		}

		createdShader, err := repo.CreateShader(shader)

		// Assertions
		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if createdShader == nil {
			t.Fatal("Expected created shader to be non-nil")
		}

		if createdShader.ID != 1 {
			t.Errorf("Expected shader ID to be 1, got: %d", createdShader.ID)
		}

		if createdShader.Name != "Test Shader" {
			t.Errorf("Expected shader name to be 'Test Shader', got: %s", createdShader.Name)
		}

		if createdShader.UserID != 1 {
			t.Errorf("Expected user ID to be 1, got: %d", createdShader.UserID)
		}

		// Check if shader is stored in repository
		storedShader, exists := repo.shaders[1]
		if !exists {
			t.Error("Expected shader to be stored in repository")
		}

		if storedShader.Name != "Test Shader" {
			t.Errorf("Expected stored shader name to be 'Test Shader', got: %s", storedShader.Name)
		}
	})

	// Test case 2: Create multiple shaders and verify ID increment
	t.Run("CreateMultipleShadersIDIncrement", func(t *testing.T) {
		shader1 := models.Shader{
			UserID: 1,
			Name:   "Shader 1",
			ShaderScripts: []models.ShaderScript{
				{ID: 1, Code: "// Shader 1 code"},
			},
		}

		shader2 := models.Shader{
			UserID: 1,
			Name:   "Shader 2",
			ShaderScripts: []models.ShaderScript{
				{ID: 2, Code: "// Shader 2 code"},
			},
		}

		created1, err1 := repo.CreateShader(shader1)
		created2, err2 := repo.CreateShader(shader2)

		if err1 != nil || err2 != nil {
			t.Fatalf("Expected no errors, got: %v, %v", err1, err2)
		}

		if created1.ID != 2 { // Should be 2 since we already created one shader
			t.Errorf("Expected first shader ID to be 2, got: %d", created1.ID)
		}

		if created2.ID != 3 {
			t.Errorf("Expected second shader ID to be 3, got: %d", created2.ID)
		}

		if repo.nextShaderID != 4 {
			t.Errorf("Expected nextShaderID to be 4, got: %d", repo.nextShaderID)
		}
	})

	// Test case 3: Verify index updates
	t.Run("VerifyIndexUpdates", func(t *testing.T) {
		shader := models.Shader{
			UserID: 1,
			Name:   "Index Test Shader",
			Tags:   []models.Tag{testTag},
		}

		created, err := repo.CreateShader(shader)
		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		// Check shadersByUser index
		userShaders, exists := repo.shadersByUser[1]
		if !exists {
			t.Error("Expected user to have shaders in index")
		}

		found := false
		for _, shaderID := range userShaders {
			if shaderID == created.ID {
				found = true
				break
			}
		}
		if !found {
			t.Error("Expected created shader to be in user's shader index")
		}

		// Check shadersByTag index
		tagShaders, exists := repo.shadersByTag["fragment"]
		if !exists {
			t.Error("Expected tag to have shaders in index")
		}

		found = false
		for _, shaderID := range tagShaders {
			if shaderID == created.ID {
				found = true
				break
			}
		}
		if !found {
			t.Error("Expected created shader to be in tag's shader index")
		}
	})

	// Test case 4: Create shader with multiple tags
	t.Run("CreateShaderWithMultipleTags", func(t *testing.T) {
		tag2 := models.Tag{ID: 2, Name: "vertex"}
		repo.tags[2] = tag2

		shader := models.Shader{
			UserID: 1,
			Name:   "Multi-tag Shader",
			Tags:   []models.Tag{testTag, tag2},
		}

		created, err := repo.CreateShader(shader)
		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if len(created.Tags) != 2 {
			t.Errorf("Expected 2 tags, got: %d", len(created.Tags))
		}

		// Check both tags in index
		fragmentShaders := repo.shadersByTag["fragment"]
		vertexShaders := repo.shadersByTag["vertex"]

		foundInFragment := false
		foundInVertex := false

		for _, shaderID := range fragmentShaders {
			if shaderID == created.ID {
				foundInFragment = true
				break
			}
		}

		for _, shaderID := range vertexShaders {
			if shaderID == created.ID {
				foundInVertex = true
				break
			}
		}

		if !foundInFragment {
			t.Error("Expected shader to be indexed under 'fragment' tag")
		}

		if !foundInVertex {
			t.Error("Expected shader to be indexed under 'vertex' tag")
		}
	})

	// Test case 5: Create shader with empty tags
	t.Run("CreateShaderWithEmptyTags", func(t *testing.T) {
		shader := models.Shader{
			UserID: 1,
			Name:   "No Tags Shader",
			Tags:   []models.Tag{},
		}

		created, err := repo.CreateShader(shader)
		if err != nil {
			t.Fatalf("Expected no error, got: %v", err)
		}

		if len(created.Tags) != 0 {
			t.Errorf("Expected 0 tags, got: %d", len(created.Tags))
		}
	})

	// Cleanup: Remove any test files that might have been created
	// Note: In a real test environment, you might want to use a temporary directory
	t.Cleanup(func() {
		os.RemoveAll("data")
	})
}

func TestCreateShaderConcurrency(t *testing.T) {
	// Test concurrent creation to ensure thread safety
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

	// Create test user
	repo.users[1] = models.User{ID: 1, Username: "testuser", Password: "testpass"}

	// Create multiple shaders concurrently
	numShaders := 10
	results := make(chan *models.Shader, numShaders)
	errors := make(chan error, numShaders)

	for i := 0; i < numShaders; i++ {
		go func(index int) {
			shader := models.Shader{
				UserID: 1,
				Name:   fmt.Sprintf("Concurrent Shader %d", index),
			}
			created, err := repo.CreateShader(shader)
			if err != nil {
				errors <- err
			} else {
				results <- created
			}
		}(i)
	}

	// Collect results
	createdShaders := make([]*models.Shader, 0, numShaders)
	for i := 0; i < numShaders; i++ {
		select {
		case shader := <-results:
			createdShaders = append(createdShaders, shader)
		case err := <-errors:
			t.Fatalf("Unexpected error during concurrent creation: %v", err)
		}
	}

	// Verify all shaders were created with unique IDs
	if len(createdShaders) != numShaders {
		t.Errorf("Expected %d shaders, got: %d", numShaders, len(createdShaders))
	}

	idMap := make(map[int]bool)
	for _, shader := range createdShaders {
		if idMap[shader.ID] {
			t.Errorf("Duplicate shader ID found: %d", shader.ID)
		}
		idMap[shader.ID] = true
	}

	t.Cleanup(func() {
		os.RemoveAll("data")
	})
}