package data

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"go-server/internal/models"
)

const (
	dataDir     = "data"
	usersFile   = "users.json"
	shadersFile = "shaders.json"
	tagsFile    = "tags.json"
)

type Repository struct {
	mu      sync.RWMutex
	users   map[int]models.User
	shaders map[int]models.Shader
	tags    map[int]models.Tag
	
	// Indexes for efficient querying
	usersByUsername map[string]*models.User
	shadersByUser   map[int][]int // userID -> []shaderID
	shadersByTag    map[string][]int // tagName -> []shaderID
	
	// Auto-increment counters
	nextUserID   int
	nextShaderID int
	nextTagID    int
}

var repo *Repository
var once sync.Once

// GetRepository returns the singleton repository instance
func GetRepository() *Repository {
	once.Do(func() {
		repo = &Repository{
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
		repo.loadData()
	})
	return repo
}

// loadData loads all data from JSON files and builds indexes
func (r *Repository) loadData() {
	r.ensureDataDir()
	
	// Load users
	if err := r.loadUsers(); err != nil {
		fmt.Printf("Warning: Could not load users: %v\n", err)
		r.createDefaultUsers()
	}
	
	// Load tags
	if err := r.loadTags(); err != nil {
		fmt.Printf("Warning: Could not load tags: %v\n", err)
		r.createDefaultTags()
	}
	
	// Load shaders
	if err := r.loadShaders(); err != nil {
		fmt.Printf("Warning: Could not load shaders: %v\n", err)
		r.createDefaultShaders()
	}
	
	r.buildIndexes()
}

// ensureDataDir creates the data directory if it doesn't exist
func (r *Repository) ensureDataDir() {
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		os.MkdirAll(dataDir, 0755)
	}
}

// User operations
func (r *Repository) loadUsers() error {
	path := filepath.Join(dataDir, usersFile)
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return err
	}
	
	var users []models.User
	if err := json.Unmarshal(data, &users); err != nil {
		return err
	}
	
	for _, user := range users {
		r.users[user.ID] = user
		if user.ID >= r.nextUserID {
			r.nextUserID = user.ID + 1
		}
	}
	
	return nil
}

func (r *Repository) saveUsers() error {
	users := make([]models.User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, user)
	}
	
	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return err
	}
	
	path := filepath.Join(dataDir, usersFile)
	return ioutil.WriteFile(path, data, 0644)
}

func (r *Repository) createDefaultUsers() {
	defaultUsers := []models.User{
		{ID: 1, Username: "admin", Password: "password123"},
		{ID: 2, Username: "user", Password: "userpass"},
		{ID: 3, Username: "demo", Password: "demo123"},
	}
	
	for _, user := range defaultUsers {
		r.users[user.ID] = user
	}
	r.nextUserID = 4
	r.saveUsers()
}

// Tag operations
func (r *Repository) loadTags() error {
	path := filepath.Join(dataDir, tagsFile)
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return err
	}
	
	var tags []models.Tag
	if err := json.Unmarshal(data, &tags); err != nil {
		return err
	}
	
	for _, tag := range tags {
		r.tags[tag.ID] = tag
		if tag.ID >= r.nextTagID {
			r.nextTagID = tag.ID + 1
		}
	}
	
	return nil
}

func (r *Repository) saveTags() error {
	tags := make([]models.Tag, 0, len(r.tags))
	for _, tag := range r.tags {
		tags = append(tags, tag)
	}
	
	data, err := json.MarshalIndent(tags, "", "  ")
	if err != nil {
		return err
	}
	
	path := filepath.Join(dataDir, tagsFile)
	return ioutil.WriteFile(path, data, 0644)
}

func (r *Repository) createDefaultTags() {
	defaultTags := []models.Tag{
		{ID: 1, Name: "fragment"},
		{ID: 2, Name: "vertex"},
		{ID: 3, Name: "compute"},
		{ID: 4, Name: "raytracing"},
		{ID: 5, Name: "animation"},
		{ID: 6, Name: "procedural"},
		{ID: 7, Name: "lighting"},
		{ID: 8, Name: "post-processing"},
	}
	
	for _, tag := range defaultTags {
		r.tags[tag.ID] = tag
	}
	r.nextTagID = 9
	r.saveTags()
}

// Shader operations
func (r *Repository) loadShaders() error {
	path := filepath.Join(dataDir, shadersFile)
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return err
	}
	
	var shaders []models.Shader
	if err := json.Unmarshal(data, &shaders); err != nil {
		return err
	}
	
	for _, shader := range shaders {
		r.shaders[shader.ID] = shader
		if shader.ID >= r.nextShaderID {
			r.nextShaderID = shader.ID + 1
		}
	}
	
	return nil
}

func (r *Repository) saveShaders() error {
	shaders := make([]models.Shader, 0, len(r.shaders))
	for _, shader := range r.shaders {
		shaders = append(shaders, shader)
	}
	
	data, err := json.MarshalIndent(shaders, "", "  ")
	if err != nil {
		return err
	}
	
	path := filepath.Join(dataDir, shadersFile)
	return ioutil.WriteFile(path, data, 0644)
}

func (r *Repository) createDefaultShaders() {
	defaultShaders := []models.Shader{
		{
			ID:     1,
			UserID: 1,
			Name:   "Basic Fragment Shader",
			ShaderScripts: []models.ShaderScript{
				{ID: 1, Code: "precision mediump float;\nvoid main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}"},
			},
			Tags: []models.Tag{{ID: 1, Name: "fragment"}},
		},
		{
			ID:     2,
			UserID: 2,
			Name:   "Simple Vertex Shader",
			ShaderScripts: []models.ShaderScript{
				{ID: 2, Code: "attribute vec4 position;\nvoid main() {\n  gl_Position = position;\n}"},
			},
			Tags: []models.Tag{{ID: 2, Name: "vertex"}},
		},
		{
			ID:     3,
			UserID: 1,
			Name:   "Animated Color Shader",
			ShaderScripts: []models.ShaderScript{
				{ID: 3, Code: "precision mediump float;\nuniform float time;\nvoid main() {\n  gl_FragColor = vec4(sin(time), cos(time), 0.5, 1.0);\n}"},
			},
			Tags: []models.Tag{{ID: 1, Name: "fragment"}, {ID: 5, Name: "animation"}},
		},
	}
	
	for _, shader := range defaultShaders {
		r.shaders[shader.ID] = shader
	}
	r.nextShaderID = 4
	r.saveShaders()
}

// buildIndexes creates efficient lookup indexes
func (r *Repository) buildIndexes() {
	// Clear existing indexes
	r.usersByUsername = make(map[string]*models.User)
	r.shadersByUser = make(map[int][]int)
	r.shadersByTag = make(map[string][]int)
	
	// Build user indexes
	for _, user := range r.users {
		userCopy := user
		r.usersByUsername[user.Username] = &userCopy
	}
	
	// Build shader indexes
	for _, shader := range r.shaders {
		// Index by user
		r.shadersByUser[shader.UserID] = append(r.shadersByUser[shader.UserID], shader.ID)
		
		// Index by tags
		for _, tag := range shader.Tags {
			tagName := strings.ToLower(tag.Name)
			r.shadersByTag[tagName] = append(r.shadersByTag[tagName], shader.ID)
		}
	}
}

// Public API methods

// User methods
func (r *Repository) GetUserByUsername(username string) *models.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.usersByUsername[username]
}

func (r *Repository) GetUserByID(id int) *models.User {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if user, exists := r.users[id]; exists {
		return &user
	}
	return nil
}

// Shader methods
func (r *Repository) GetShaderByID(id int) *models.Shader {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if shader, exists := r.shaders[id]; exists {
		return &shader
	}
	return nil
}

// Helper method to process tags and ensure they have proper IDs (lock-free for internal use)
func (r *Repository) processTags(tags []models.Tag) ([]models.Tag, error) {
	var processedTags []models.Tag
	
	for _, tag := range tags {
		tagName := strings.TrimSpace(tag.Name)
		if tagName == "" {
			continue // Skip empty tag names
		}
		
		// Check if tag already exists (lock-free version)
		existingTag := r.getTagByNameLockFree(tagName)
		if existingTag != nil {
			// Use existing tag with proper ID
			processedTags = append(processedTags, *existingTag)
		} else {
			// Create new tag (lock-free version)
			newTag, err := r.createTagLockFree(tagName)
			if err != nil {
				return nil, fmt.Errorf("failed to create tag '%s': %v", tagName, err)
			}
			processedTags = append(processedTags, *newTag)
		}
	}
	
	return processedTags, nil
}

// Lock-free version for internal use when mutex is already held
func (r *Repository) getTagByNameLockFree(name string) *models.Tag {
	for _, tag := range r.tags {
		if strings.EqualFold(tag.Name, name) {
			return &tag
		}
	}
	return nil
}

// Lock-free version for internal use when mutex is already held
func (r *Repository) createTagLockFree(name string) (*models.Tag, error) {
	// Check if tag already exists
	for _, tag := range r.tags {
		if strings.EqualFold(tag.Name, name) {
			return &tag, nil
		}
	}
	
	tag := models.Tag{
		ID:   r.nextTagID,
		Name: name,
	}
	r.nextTagID++
	
	r.tags[tag.ID] = tag
	
	// Note: We don't save tags here as that would be done by the calling method
	return &tag, nil
}

func (r *Repository) CreateShader(shader models.Shader) (*models.Shader, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	// Process tags to ensure they have proper IDs
	processedTags, err := r.processTags(shader.Tags)
	if err != nil {
		return nil, err
	}
	shader.Tags = processedTags
	
	shader.ID = r.nextShaderID
	r.nextShaderID++
	
	r.shaders[shader.ID] = shader
	
	// Update indexes
	r.shadersByUser[shader.UserID] = append(r.shadersByUser[shader.UserID], shader.ID)
	for _, tag := range shader.Tags {
		tagName := strings.ToLower(tag.Name)
		r.shadersByTag[tagName] = append(r.shadersByTag[tagName], shader.ID)
	}
	
	// Save both shaders and tags since we may have created new tags
	if err := r.saveShaders(); err != nil {
		return nil, err
	}
	if err := r.saveTags(); err != nil {
		return nil, err
	}
	
	return &shader, nil
}

func (r *Repository) UpdateShader(id int, shader models.Shader) (*models.Shader, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.shaders[id]; !exists {
		return nil, fmt.Errorf("shader not found")
	}
	
	// Process tags to ensure they have proper IDs
	processedTags, err := r.processTags(shader.Tags)
	if err != nil {
		return nil, err
	}
	shader.Tags = processedTags
	
	shader.ID = id
	r.shaders[id] = shader
	
	// Rebuild indexes (could be optimized)
	r.buildIndexes()
	
	// Save both shaders and tags since we may have created new tags
	if err := r.saveShaders(); err != nil {
		return nil, err
	}
	if err := r.saveTags(); err != nil {
		return nil, err
	}
	
	return &shader, nil
}

func (r *Repository) DeleteShader(id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.shaders[id]; !exists {
		return fmt.Errorf("shader not found")
	}
	
	delete(r.shaders, id)
	
	// Rebuild indexes
	r.buildIndexes()
	
	return r.saveShaders()
}

// SearchShaders performs efficient searching based on parameters
func (r *Repository) SearchShaders(params models.SearchParams) []models.Shader {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	var candidateIDs []int
	
	// Start with all shaders if no specific filters
	if params.UserID == 0 && len(params.Tags) == 0 && params.ShaderID == 0 {
		for id := range r.shaders {
			candidateIDs = append(candidateIDs, id)
		}
	}
	
	// Filter by specific shader ID
	if params.ShaderID != 0 {
		if _, exists := r.shaders[params.ShaderID]; exists {
			candidateIDs = []int{params.ShaderID}
		} else {
			return []models.Shader{}
		}
	}
	
	// Filter by user ID
	if params.UserID != 0 {
		candidateIDs = r.intersectIDs(candidateIDs, r.shadersByUser[params.UserID])
	}
	
	// Filter by username
	if params.Username != "" {
		if user := r.usersByUsername[params.Username]; user != nil {
			candidateIDs = r.intersectIDs(candidateIDs, r.shadersByUser[user.ID])
		} else {
			return []models.Shader{}
		}
	}
	
	// Filter by tags (intersection of all tags)
	for _, tagName := range params.Tags {
		tagName = strings.ToLower(tagName)
		candidateIDs = r.intersectIDs(candidateIDs, r.shadersByTag[tagName])
	}
	
	// Convert IDs to shaders and filter by name
	var results []models.Shader
	for _, id := range candidateIDs {
		shader := r.shaders[id]
		
		// Filter by name if specified
		if params.Name != "" && !strings.Contains(strings.ToLower(shader.Name), strings.ToLower(params.Name)) {
			continue
		}
		
		// Populate author field by looking up the user
		if user := r.GetUserByID(shader.UserID); user != nil {
			shader.Author = user.Username
		} else {
			shader.Author = "Unknown"
		}
		
		results = append(results, shader)
	}
	
	// Sort by ID (most recent first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].ID > results[j].ID
	})
	
	// Apply pagination
	if params.Page > 0 {
		pageSize := 10
		start := (params.Page - 1) * pageSize
		end := start + pageSize
		
		if start >= len(results) {
			return []models.Shader{}
		}
		if end > len(results) {
			end = len(results)
		}
		results = results[start:end]
	}
	
	return results
}

// Helper function to intersect two slices of IDs
func (r *Repository) intersectIDs(a, b []int) []int {
	if len(a) == 0 {
		return b
	}
	if len(b) == 0 {
		return a
	}
	
	m := make(map[int]bool)
	for _, id := range a {
		m[id] = true
	}
	
	var result []int
	for _, id := range b {
		if m[id] {
			result = append(result, id)
		}
	}
	
	return result
}

// Tag methods
func (r *Repository) GetAllTags() []models.Tag {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	tags := make([]models.Tag, 0, len(r.tags))
	for _, tag := range r.tags {
		tags = append(tags, tag)
	}
	
	sort.Slice(tags, func(i, j int) bool {
		return tags[i].Name < tags[j].Name
	})
	
	return tags
}

func (r *Repository) GetTagByName(name string) *models.Tag {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	for _, tag := range r.tags {
		if strings.EqualFold(tag.Name, name) {
			return &tag
		}
	}
	return nil
}

func (r *Repository) CreateTag(name string) (*models.Tag, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	// Check if tag already exists
	for _, tag := range r.tags {
		if strings.EqualFold(tag.Name, name) {
			return &tag, nil
		}
	}
	
	tag := models.Tag{
		ID:   r.nextTagID,
		Name: name,
	}
	r.nextTagID++
	
	r.tags[tag.ID] = tag
	
	if err := r.saveTags(); err != nil {
		return nil, err
	}
	
	return &tag, nil
}