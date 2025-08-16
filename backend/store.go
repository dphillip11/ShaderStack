package main

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"
)

type InMemoryStore struct {
	mu       sync.RWMutex
	users    map[string]*User            // id -> user
	usersBy  map[string]*User            // username -> user
	shaders  map[string]*Shader          // id -> shader
	byUser   map[string]map[string]bool  // userID -> shaderID set
	tags     map[string]int              // tag -> count
	onChange func()
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		users:   make(map[string]*User),
		usersBy: make(map[string]*User),
		shaders: make(map[string]*Shader),
		byUser:  make(map[string]map[string]bool),
		tags:    make(map[string]int),
	}
}

var (
	errUserExists    = errors.New("user already exists")
	errUserNotFound  = errors.New("user not found")
	errShaderNotFound = errors.New("shader not found")
)

func (s *InMemoryStore) SetOnChange(cb func()) {
	s.mu.Lock()
	s.onChange = cb
	s.mu.Unlock()
}

func (s *InMemoryStore) CreateUser(u *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.usersBy[strings.ToLower(u.Username)]; ok {
		return errUserExists
	}
	s.users[u.ID] = u
	s.usersBy[strings.ToLower(u.Username)] = u
	if s.onChange != nil {
		go s.onChange()
	}
	return nil
}

func (s *InMemoryStore) FindUserByUsername(username string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.usersBy[strings.ToLower(username)]
	if !ok {
		return nil, errUserNotFound
	}
	return u, nil
}

func (s *InMemoryStore) AddShader(sh *Shader) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sh.CreatedAt = time.Now().UTC()
	sh.UpdatedAt = sh.CreatedAt
	// normalize tags
	for i, t := range sh.Tags {
		nt := strings.ToLower(strings.TrimSpace(t))
		sh.Tags[i] = nt
		if nt != "" {
			s.tags[nt]++
		}
	}
	s.shaders[sh.ID] = sh
	if _, ok := s.byUser[sh.OwnerID]; !ok {
		s.byUser[sh.OwnerID] = make(map[string]bool)
	}
	s.byUser[sh.OwnerID][sh.ID] = true
	if s.onChange != nil {
		go s.onChange()
	}
	return nil
}

func (s *InMemoryStore) UpdateShader(ownerID, shaderID string, upd func(sh *Shader) error) (*Shader, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sh, ok := s.shaders[shaderID]
	if !ok {
		return nil, errShaderNotFound
	}
	if sh.OwnerID != ownerID {
		return nil, errors.New("forbidden")
	}
	// remove tag counts prior to update
	for _, t := range sh.Tags {
		if t != "" {
			s.tags[t]--
			if s.tags[t] <= 0 {
				delete(s.tags, t)
			}
		}
	}
	if err := upd(sh); err != nil {
		return nil, err
	}
	// re-add tag counts
	for i, t := range sh.Tags {
		nt := strings.ToLower(strings.TrimSpace(t))
		sh.Tags[i] = nt
		if nt != "" {
			s.tags[nt]++
		}
	}
	sh.UpdatedAt = time.Now().UTC()
	if s.onChange != nil {
		go s.onChange()
	}
	return sh, nil
}

func (s *InMemoryStore) GetShader(id string) (*Shader, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sh, ok := s.shaders[id]
	if !ok {
		return nil, errShaderNotFound
	}
	return sh, nil
}

func (s *InMemoryStore) ListShaders(limit, offset int) []*Shader {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*Shader, 0, len(s.shaders))
	for _, sh := range s.shaders {
		list = append(list, sh)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt.After(list[j].CreatedAt) })
	if offset >= len(list) {
		return []*Shader{}
	}
	end := offset + limit
	if end > len(list) {
		end = len(list)
	}
	return list[offset:end]
}

func (s *InMemoryStore) ListShadersByUser(userID string) []*Shader {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*Shader
	for sid := range s.byUser[userID] {
		res = append(res, s.shaders[sid])
	}
	sort.Slice(res, func(i, j int) bool { return res[i].CreatedAt.After(res[j].CreatedAt) })
	return res
}

func (s *InMemoryStore) ListTags() []Tag {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Tag, 0, len(s.tags))
	for k, v := range s.tags {
		out = append(out, Tag{Name: k, Count: v})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
	return out
}

func (s *InMemoryStore) SearchShaders(query string, limit, offset int) (results []*Shader, total int) {
	q := strings.ToLower(strings.TrimSpace(query))
	s.mu.RLock()
	defer s.mu.RUnlock()
	if q == "" { // fallback to list
		all := make([]*Shader, 0, len(s.shaders))
		for _, sh := range s.shaders {
			all = append(all, sh)
		}
		sort.Slice(all, func(i, j int) bool { return all[i].CreatedAt.After(all[j].CreatedAt) })
		total = len(all)
		if offset >= total {
			return []*Shader{}, total
		}
		end := offset + limit
		if end > total {
			end = total
		}
		return all[offset:end], total
	}
	filtered := make([]*Shader, 0)
	for _, sh := range s.shaders {
		if strings.Contains(strings.ToLower(sh.Title), q) || strings.Contains(strings.ToLower(sh.Code), q) {
			filtered = append(filtered, sh)
			continue
		}
		for _, t := range sh.Tags {
			if strings.Contains(t, q) {
				filtered = append(filtered, sh)
				break
			}
		}
	}
	sort.Slice(filtered, func(i, j int) bool { return filtered[i].CreatedAt.After(filtered[j].CreatedAt) })
	total = len(filtered)
	if offset >= total {
		return []*Shader{}, total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return filtered[offset:end], total
}

type PersistedData struct {
	Users   []*User            `json:"users"`
	Shaders []*Shader          `json:"shaders"`
	Tags    map[string]int     `json:"tags"`
}

func (s *InMemoryStore) Snapshot() *PersistedData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p := &PersistedData{Users: make([]*User, 0, len(s.users)), Shaders: make([]*Shader, 0, len(s.shaders)), Tags: make(map[string]int, len(s.tags))}
	for _, u := range s.users {
		c := *u
		p.Users = append(p.Users, &c)
	}
	for _, sh := range s.shaders {
		c := *sh
		c.Tags = append([]string{}, sh.Tags...)
		p.Shaders = append(p.Shaders, &c)
	}
	for k, v := range s.tags {
		p.Tags[k] = v
	}
	return p
}

func (s *InMemoryStore) Restore(p *PersistedData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users = make(map[string]*User)
	s.usersBy = make(map[string]*User)
	s.shaders = make(map[string]*Shader)
	s.byUser = make(map[string]map[string]bool)
	s.tags = make(map[string]int)
	if p == nil {
		return
	}
	for _, u := range p.Users {
		c := *u
		s.users[c.ID] = &c
		s.usersBy[strings.ToLower(c.Username)] = &c
	}
	for _, sh := range p.Shaders {
		c := *sh
		c.Tags = append([]string{}, sh.Tags...)
		s.shaders[c.ID] = &c
		if _, ok := s.byUser[c.OwnerID]; !ok {
			s.byUser[c.OwnerID] = make(map[string]bool)
		}
		s.byUser[c.OwnerID][c.ID] = true
	}
	for k, v := range p.Tags {
		s.tags[k] = v
	}
}
