package models

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
}

type Tag struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type BufferSpec struct {
	Format string `json:"format"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type ComputeSpec struct {
	WorkgroupSize struct {
		X int `json:"x"`
		Y int `json:"y"`
		Z int `json:"z"`
	} `json:"workgroupSize"`
}

type ShaderScript struct {
	ID      int          `json:"id"`
	Code    string       `json:"code"`
	Buffer  BufferSpec   `json:"buffer"`
	Kind    string       `json:"kind,omitempty"` // 'fragment' (default) or 'compute'
	Compute *ComputeSpec `json:"compute,omitempty"`
}

type Shader struct {
	ID            int            `json:"id"`
	UserID        int            `json:"user_id"`
	Name          string         `json:"name"`
	Author        string         `json:"author,omitempty"` // Added author field
	ShaderScripts []ShaderScript `json:"shader_scripts"`
	Tags          []Tag          `json:"tags,omitempty"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Session struct {
	Token  string `json:"token"`
	UserID int    `json:"user_id"`
}

type SearchParams struct {
	Query  string   `json:"query,omitempty"`
	Tags   []string `json:"tags,omitempty"`
	UserID int      `json:"user_id,omitempty"`
	Limit  int      `json:"limit,omitempty"`
	Offset int      `json:"offset,omitempty"`
}

type AuthenticationInfo struct {
	IsAuthenticated bool   `json:"is_authenticated"`
	Username        string `json:"username,omitempty"`
	UserID          int    `json:"user_id,omitempty"`
}

type BrowsePageData struct {
	Shaders         []Shader
	AuthInfo        AuthenticationInfo
	SearchQuery     SearchParams
	ShowLoginPrompt bool
}

type EditorPageData struct {
	AuthInfo AuthenticationInfo
	Shader   Shader
	Author   string
}
