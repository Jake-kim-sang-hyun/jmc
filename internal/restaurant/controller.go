package restaurant

import (
	"embed"
	"encoding/json"
	"html/template"
	"io/fs"
	"net/http"
	"strings"
)

type Controller struct {
	service *Service
	tmpl    *template.Template
}

func NewController(service *Service, wikiFiles embed.FS) *Controller {
	funcMap := template.FuncMap{
		"nl2br": func(s string) template.HTML {
			escaped := template.HTMLEscapeString(s)
			return template.HTML(strings.ReplaceAll(escaped, "\n", "<br>"))
		},
		"json": func(v any) template.JS {
			b, _ := json.Marshal(v)
			return template.JS(b)
		},
	}
	tmpl, _ := template.New("index.html").Funcs(funcMap).ParseFS(wikiFiles, "wiki/index.html")
	return &Controller{service: service, tmpl: tmpl}
}

func (c *Controller) HandlePage(w http.ResponseWriter, r *http.Request) {
	data, err := c.service.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	c.tmpl.Execute(w, data)
}

func (c *Controller) HandleGetAll(w http.ResponseWriter, r *http.Request) {
	data, err := c.service.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (c *Controller) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var item Restaurant
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	if err := c.service.Create(item); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (c *Controller) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")

	var item Restaurant
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	if err := c.service.Update(name, item); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (c *Controller) HandleDelete(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")

	if err := c.service.Delete(name); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (c *Controller) HandleRecommend(w http.ResponseWriter, r *http.Request) {
	restaurant, err := c.service.Recommend()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if restaurant == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("null"))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(restaurant)
}

func (c *Controller) HandleSave(w http.ResponseWriter, r *http.Request) {
	var req SaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	data, err := c.service.SaveBatch(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (c *Controller) HandleSaveSearch(w http.ResponseWriter, r *http.Request) {
	var search Search
	if err := json.NewDecoder(r.Body).Decode(&search); err != nil {
		http.Error(w, "잘못된 요청입니다", http.StatusBadRequest)
		return
	}

	data, err := c.service.SaveSearch(search)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data.Search)
}

func (c *Controller) StaticFiles(wikiFiles embed.FS) http.Handler {
	subFS, _ := fs.Sub(wikiFiles, "wiki")
	return http.StripPrefix("/static/", http.FileServer(http.FS(subFS)))
}
