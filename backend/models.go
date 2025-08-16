package main

import "time"

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Shader struct {
	ID        string    `json:"id"`
	OwnerID   string    `json:"ownerId"`
	Title     string    `json:"title"`
	Code      string    `json:"code"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Tag struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// Auth / DTO structs

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type CreateShaderRequest struct {
	Title string   `json:"title"`
	Code  string   `json:"code"`
	Tags  []string `json:"tags"`
}

type UpdateShaderRequest struct {
	Title *string   `json:"title"`
	Code  *string   `json:"code"`
	Tags  *[]string `json:"tags"`
}
