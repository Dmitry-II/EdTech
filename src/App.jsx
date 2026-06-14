import { useState, useRef, useEffect } from 'react';
import { courseData } from './courseData';

function App() {
  const hasData = courseData && courseData.length > 0;

  const [activeCourse, setActiveCourse] = useState(null);
  const [customNames, setCustomNames] = useState(() => {
    const saved = localStorage.getItem('course_custom_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [completedLessons, setCompletedLessons] = useState(() => {
    const saved = localStorage.getItem('course_completed_lessons');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentLesson, setCurrentLesson] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('course_custom_names', JSON.stringify(customNames));
  }, [customNames]);

  useEffect(() => {
    localStorage.setItem('course_completed_lessons', JSON.stringify(completedLessons));
  }, [completedLessons]);

  const openCourse = (course) => {
    setActiveCourse(course);
    const lastWatchedId = localStorage.getItem(`last_watched_${course.id}`);
    
    let lessonToStart = course.modules[0]?.lessons[0];
    if (lastWatchedId) {
      const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
      const found = allLessons.find(l => l.id === lastWatchedId);
      if (found) lessonToStart = found;
    }
    setCurrentLesson(lessonToStart);
  };

  const resetCourseProgress = (course, e) => {
    e.stopPropagation(); 
    if (window.confirm("Вы уверены, что хотите сбросить прогресс этого курса?")) {
      const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
      
      setCompletedLessons(prev => {
        const updated = { ...prev };
        allLessons.forEach(lesson => {
          delete updated[lesson.id];
        });
        return updated;
      });
      
      localStorage.removeItem(`last_watched_${course.id}`);
    }
  };

  useEffect(() => {
    if (!currentLesson || !activeCourse) return;

    localStorage.setItem(`last_watched_${activeCourse.id}`, currentLesson.id);
    const savedTime = localStorage.getItem(`course_time_${currentLesson.id}`);
    
    if (videoRef.current) {
      videoRef.current.src = currentLesson.url;
      videoRef.current.load();
      if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
      videoRef.current.play().catch(() => console.log("Ожидание клика для старта"));
    }
  }, [currentLesson, activeCourse]);

  const handleTimeUpdate = () => {
    if (videoRef.current && currentLesson) {
      localStorage.setItem(`course_time_${currentLesson.id}`, videoRef.current.currentTime);
    }
  };

  const handleMediaEnded = () => {
    if (!currentLesson || !activeCourse) return;
    setCompletedLessons(prev => ({ ...prev, [currentLesson.id]: true }));

    const allLessons = activeCourse.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
    }
  };

  const toggleLessonCompletion = (lessonId, e) => {
    e.stopPropagation();
    setCompletedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
  };

  const renameCourse = (courseId, oldName, e) => {
    e.stopPropagation();
    const newName = prompt("Введите новое название курса:", customNames[courseId] || oldName);
    if (newName && newName.trim() !== "") {
      setCustomNames(prev => ({ ...prev, [courseId]: newName.trim() }));
    }
  };

  if (!activeCourse) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {}
          <h1 style={{ 
            display: 'inline-block',
            margin: '0 0 40px 0', 
            fontSize: '28px', 
            padding: '12px 32px', 
            border: '2px solid #475569', 
            borderRadius: '9999px', 
            backgroundColor: 'transparent',
            color: '#e2e8f0'
          }}>
            Мое обучение:
          </h1>
          
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
              <h2>Курсы не найдены</h2>
              <p style={{ color: '#94a3b8' }}>Поместите папки с курсами в <code>public/courses/</code> и перезапустите локальный сервер.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {courseData.map(course => {
                const displayName = customNames[course.id] || course.originalTitle;
                const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
                const totalCount = allLessons.length;
                const doneCount = allLessons.filter(l => completedLessons[l.id]).length;
                const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                return (
                  <div key={course.id} style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '30px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <button 
                      onClick={(e) => renameCourse(course.id, course.originalTitle, e)}
                      style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}
                      title="Переименовать"
                    >
                      ✏️
                    </button>
                    
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#f8fafc', paddingRight: '40px' }}>{displayName}</h3>
                    
                    {}
                    <div style={{ marginBottom: '16px' }}>
                      <button 
                        onClick={(e) => resetCourseProgress(course, e)}
                        style={{ background: 'none', border: 'none', padding: 0, color: '#64748b', fontSize: '13px', cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#94a3b8'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                      >
                        Сброс прогресса
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '24px', width: '100%' }}>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#4ade80', transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                        {progress}% материалов пройдено
                      </div>
                    </div>

                    <div>
                      <button 
                        onClick={() => openCourse(course)}
                        style={{ backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                      >
                        Продолжить
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allCurrentCourseLessons = activeCourse.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
  const totalLessonsCount = allCurrentCourseLessons.length;
  const completedCount = allCurrentCourseLessons.filter(l => completedLessons[l.id]).length;
  const progressPercentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      
      {}
      <aside style={{ width: '380px', minWidth: '380px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
          
          <h2 
            onClick={() => setActiveCourse(null)}
            style={{ fontSize: '20px', margin: '0 0 16px 0', color: '#f8fafc', lineHeight: '1.4', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#38bdf8'}
            onMouseOut={(e) => e.currentTarget.style.color = '#f8fafc'}
            title="Вернуться к списку курсов"
          >
            {customNames[activeCourse.id] || activeCourse.originalTitle}
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
            <span>Прогресс:</span>
            <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{progressPercentage}%</span>
          </div>

          <div style={{ width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {activeCourse.modules.map((mod) => (
            <div key={mod.id} style={{ marginBottom: '16px' }}>
              <div style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '700', color: '#e2e8f0', backgroundColor: '#1e293b' }}>
                {mod.title}
              </div>
              <div>
                {mod.lessons.map((lesson) => {
                  const isActive = currentLesson && currentLesson.id === lesson.id;
                  const isDone = !!completedLessons[lesson.id];
                  
                  return (
                    <div key={lesson.id} onClick={() => setCurrentLesson(lesson)} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', cursor: 'pointer', backgroundColor: isActive ? '#334155' : 'transparent', borderLeft: isActive ? '4px solid #22c55e' : '4px solid transparent', transition: 'background-color 0.2s', color: isActive ? '#ffffff' : '#cbd5e1' }}>
                      <div onClick={(e) => toggleLessonCompletion(lesson.id, e)} style={{ width: '20px', height: '20px', borderRadius: '6px', border: isDone ? 'none' : '2px solid #64748b', backgroundColor: isDone ? '#22c55e' : 'transparent', marginRight: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                        {isDone && "✓"}
                      </div>
                      <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {lesson.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {currentLesson ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '600', color: '#ffffff', margin: 0 }}>{currentLesson.title}</h1>
              <button 
                onClick={handleMediaEnded}
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
              >
                Отметить пройденным
              </button>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} controls onTimeUpdate={handleTimeUpdate} onEnded={handleMediaEnded} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
            Выберите урок для начала.
          </div>
        )}
      </main>
    </div>
  );
}

export default App;