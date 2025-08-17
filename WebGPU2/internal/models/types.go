package models

import "html/template"

type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Password string `json:"password,omitempty"`
}

type Tag struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

type ShaderScript struct {
    ID     int    `json:"id"`
    Code   string `json:"code"`
}

type Shader struct {
    ID            int            `json:"id"`
    UserID        int            `json:"user_id"`
    Name          string         `json:"name"`
    Author        string         `json:"author,omitempty"`        // Added author field
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
    Name     string   `json:"name,omitempty"`
    Page     int      `json:"page,omitempty"`
    Tags     []string `json:"tags,omitempty"`
    Username string   `json:"username,omitempty"`
    UserID   int      `json:"user_id,omitempty"`
    ShaderID int      `json:"shader_id,omitempty"`
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
}

type EditorPageData struct {
    AuthInfo        AuthenticationInfo
    Shader          Shader
    Author          string
}

type SplitWindowData struct {
    AuthInfo        AuthenticationInfo
    Vertical     bool
    LeftContent  template.HTML
    RightContent template.HTML
}