import os
import json
import re

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def build_course_data():
    base_dir = os.path.join('public', 'courses')
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        print(f"Директория {base_dir} создана. Поместите туда папки с курсами.")
        return
        
    all_courses = []
    courses = sorted([c for c in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, c))], key=natural_sort_key)
    
    for course_idx, course_name in enumerate(courses, start=1):
        course_path = os.path.join(base_dir, course_name)
        course_item = {
            "id": f"course_{course_idx}",
            "originalTitle": course_name,
            "modules": []
        }
        
        modules = sorted([m for m in os.listdir(course_path) if os.path.isdir(os.path.join(course_path, m))], key=natural_sort_key)
        for mod_idx, mod_name in enumerate(modules, start=1):
            mod_path = os.path.join(course_path, mod_name)
            module_item = {
                "id": f"mod_{course_idx}_{mod_idx}",
                "title": mod_name,
                "lessons": []
            }
            
            files = sorted([f for f in os.listdir(mod_path) if f.lower().endswith(('.mp4', '.webm', '.ogg'))], key=natural_sort_key)
            for file_idx, file_name in enumerate(files, start=1):
                display_title = os.path.splitext(file_name)[0]
                full_url = os.path.join("courses", course_name, mod_name, file_name)
                video_url = "/" + full_url.replace(os.sep, '/')
                module_item["lessons"].append({
                    "id": f"less_{course_idx}_{mod_idx}_{file_idx}",
                    "title": display_title,
                    "url": video_url
                })
            
            if module_item["lessons"]:
                course_item["modules"].append(module_item)
                
        if course_item["modules"]:
            all_courses.append(course_item)

    output_path = os.path.join('src', 'courseData.js')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Автогенерируемый файл. Не редактируйте вручную.\n")
        f.write("export const courseData = ")
        f.write(json.dumps(all_courses, indent=2, ensure_ascii=False))
        f.write(";\n")
        
    print(f"Успех! Проиндексировано курсов: {len(all_courses)}.")

if __name__ == '__main__':
    build_course_data()