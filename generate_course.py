import json
import re
import os
from googleapiclient.discovery import build

# ================= НАСТРОЙКИ =================
API_KEY = "AIzaSyCDsY5CHB7hYbW16OqX2PyD7WTwYSj4rCw"
ROOT_FOLDER_ID = "1qSGkvSEyaI1t6hojDVG4nJtPOjxk2rEQ" # Твой ID папки
# =============================================

drive_service = build('drive', 'v3', developerKey=API_KEY)

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def get_items_in_folder(folder_id):
    query = f"'{folder_id}' in parents and trashed = false"
    items = []
    page_token = None
    
    while True:
        response = drive_service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType)",
            pageSize=1000,
            pageToken=page_token
        ).execute()
        
        items.extend(response.get('files', []))
        page_token = response.get('nextPageToken')
        if not page_token:
            break
            
    return items

def build_course_data():
    print("[/] Подключение к Google Диску и сканирование курсов...")
    
    root_items = get_items_in_folder(ROOT_FOLDER_ID)
    course_folders = [item for item in root_items if item['mimeType'] == 'application/vnd.google-apps.folder']
    course_folders.sort(key=lambda x: natural_sort_key(x['name']))
    
    all_courses = []
    
    for course_idx, course_folder in enumerate(course_folders, start=1):
        course_name = course_folder['name']
        course_id = course_folder['id']
        
        course_item = {
            "id": f"course_{course_idx}",
            "originalTitle": course_name,
            "modules": []
        }
        
        course_contents = get_items_in_folder(course_id)
        module_folders = [item for item in course_contents if item['mimeType'] == 'application/vnd.google-apps.folder']
        module_folders.sort(key=lambda x: natural_sort_key(x['name']))
        
        for mod_idx, mod_folder in enumerate(module_folders, start=1):
            mod_name = mod_folder['name']
            mod_id = mod_folder['id']
            
            module_item = {
                "id": f"mod_{course_idx}_{mod_idx}",
                "title": mod_name,
                "lessons": []
            }
            
            mod_contents = get_items_in_folder(mod_id)
            video_files = [
                f for f in mod_contents 
                if f['mimeType'].startswith('video/') or f['name'].lower().endswith(('.mp4', '.webm', '.ogg', '.mkv'))
            ]
            video_files.sort(key=lambda x: natural_sort_key(x['name']))
            
            for file_idx, video_file in enumerate(video_files, start=1):
                file_name = video_file['name']
                file_id = video_file['id']
                
                display_title = os.path.splitext(file_name)[0]
                
                # Прямая ссылка для проигрывания напрямую в <video> HTML5
                video_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&key={API_KEY}"
                
                module_item["lessons"].append({
                    "id": f"less_{course_idx}_{mod_idx}_{file_idx}",
                    "title": display_title,
                    "url": video_url
                })
            
            if module_item["lessons"]:
                course_item["modules"].append(module_item)
                
        if course_item["modules"]:
            all_courses.append(course_item)

    os.makedirs('src', exist_ok=True)
    output_path = os.path.join('src', 'courseData.js')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("// Автогенерируемый файл. Не редактируйте вручную.\n")
        f.write("export const courseData = ")
        f.write(json.dumps(all_courses, indent=2, ensure_ascii=False))
        f.write(";\n")
        
    print(f"\n[+] Успех! Проиндексировано курсов с Google Диска: {len(all_courses)}.")

if __name__ == '__main__':
    build_course_data()