package handlers

import (
	"fmt"
	"html/template"
)

func templateFuncMap() template.FuncMap {
    return template.FuncMap{
        "dict": func(values ...interface{}) (map[string]interface{}, error) {
            if len(values)%2 != 0 {
                return nil, fmt.Errorf("invalid dict call: must have even number of arguments")
            }
            dict := make(map[string]interface{}, len(values)/2)
            for i := 0; i < len(values); i += 2 {
                key, ok := values[i].(string)
                if !ok {
                    return nil, fmt.Errorf("dict keys must be strings, got %T", values[i])
                }
                dict[key] = values[i+1]
            }
            return dict, nil
        },
    }
}
