import os
import json
import re
import shutil
from urllib.parse import quote

# Базовая ссылка на твой релиз (ПРОВЕРЬ СВОЙ ЛОГИН И ИМЯ РЕПОЗИТОРИЯ)
RELEASE_URL = "https://github.com/Dmitry-II/EdTech/releases/download/v1.0"

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def build_course_data():
    base_dir = os.path.join('public', 'courses')
    upload_dir = 'upload_ready'
    
    if not os.path.exists(base_dir):
        print(f"[-] Папка {base_dir} не найдена!")
        return

    # Очищаем или создаем папку для готовых файлов
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir)

    all_courses = []
    courses = sorted([c for c in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, c))], key=natural_sort_key)
    
    print("[/] Собираем курсы и готовим файлы к выгрузке...")

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
            
            files = sorted([f for f in os.listdir(mod_path) if f.lower().endswith(('.mp4', '.webm', '.ogg', '.mkv'))], key=natural_sort_key)
            for file_idx, file_name in enumerate(files, start=1):
                display_title = os.path.splitext(file_name)[0]
                
                # Скрипт САМ делает уникальное имя, чтобы файлы не перемешались!
                unique_filename = f"c{course_idx}_m{mod_idx}_{file_name.replace(' ', '_')}"
                
                # Копируем файл во временную папку
                src_file = os.path.join(mod_path, file_name)
                dst_file = os.path.join(upload_dir, unique_filename)
                shutil.copy2(src_file, dst_file)
                
                # Формируем прямую ссылку
                encoded_filename = quote(unique_filename)
                video_url = f"{RELEASE_URL}/{encoded_filename}"
                
                module_item["lessons"].append({
                    "id": f"less_{course_idx}_{mod_idx}_{file_idx}",
                    "title": display_title, # В интерфейсе останется красивое оригинальное имя!
                    "url": video_url
                })
            
            if module_item["lessons"]:
                course_item["modules"].append(module_item)
                
        if course_item["modules"]:
            all_courses.append(course_item)

    # Сохраняем src/courseData.js
    os.makedirs('src', exist_ok=True)
    output_path = os.path.join('src', 'courseData.js')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Автогенерируемый файл. Не редактируйте вручную.\n")
        f.write("export const courseData = ")
        f.write(json.dumps(all_courses, indent=2, ensure_ascii=False))
        f.write(";\n")
        
    print(f"\n[+] УСПЕХ! Создана папка '{upload_dir}'.")
    print(f"[!] ТЕПЕРЬ ПРОСТО ПЕРЕТАЩИ ВСЕ ФАЙЛЫ ИЗ ПАПКИ '{upload_dir}' НА СТРАНИЦУ GITHUB RELEASES И НАЖМИ PUBLISH!")

if __name__ == '__main__':
    build_course_data()
