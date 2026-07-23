import { useState, useRef, useEffect } from 'react';
import { courseData } from './courseData';

function App() {
  const hasData = courseData && courseData.length > 0;

  // Навигация и выбор курса
  // Режимы view: 'dashboard' (главная), 'content' (содержание), 'player' (просмотр)
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeCourse, setActiveCourse] = useState(null);

  // Глобальные состояния прогресса
  const [customNames, setCustomNames] = useState(() => {
    const saved = localStorage.getItem('course_custom_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [completedLessons, setCompletedLessons] = useState(() => {
    const saved = localStorage.getItem('course_completed_lessons');
    return saved ? JSON.parse(saved) : {};
  });

  // Состояния плеера и поиска
  const [currentLesson, setCurrentLesson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true);
  
  const lastScrollTop = useRef(0);
  const videoRef = useRef(null);

  // Сохранение кастомных имен и прогресса
  useEffect(() => {
    localStorage.setItem('course_custom_names', JSON.stringify(customNames));
  }, [customNames]);

  useEffect(() => {
    localStorage.setItem('course_completed_lessons', JSON.stringify(completedLessons));
  }, [completedLessons]);

  // Логика переключения экранов
  const openCourseContent = (course) => {
    setActiveCourse(course);
    setCurrentView('content');
    setSearchQuery('');
    setShowSearch(true);
    lastScrollTop.current = 0;
  };

  const startCoursePlayer = (course, specifiedLesson = null) => {
    setActiveCourse(course);
    setCurrentView('player');
    
    if (specifiedLesson) {
      setCurrentLesson(specifiedLesson);
    } else {
      const lastWatchedId = localStorage.getItem(`last_watched_${course.id}`);
      let lessonToStart = course.modules[0]?.lessons[0];
      if (lastWatchedId) {
        const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
        const found = allLessons.find(l => l.id === lastWatchedId);
        if (found) lessonToStart = found;
      }
      setCurrentLesson(lessonToStart);
    }
  };

  // Сброс прогресса курса
  const resetCourseProgress = (course, e) => {
    e.stopPropagation();
    if (window.confirm("Вы уверены, что хотите сбросить прогресс этого курса?")) {
      const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
      setCompletedLessons(prev => {
        const updated = { ...prev };
        allLessons.forEach(lesson => { delete updated[lesson.id]; });
        return updated;
      });
      localStorage.removeItem(`last_watched_${course.id}`);
    }
  };

  // Работа видеоплеера с Google Диском
  useEffect(() => {
    if (!currentLesson || !activeCourse || currentView !== 'player') return;

    localStorage.setItem(`last_watched_${activeCourse.id}`, currentLesson.id);
    const savedTime = localStorage.getItem(`course_time_${currentLesson.id}`);
    
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (savedTime && videoRef.current) {
          videoRef.current.currentTime = parseFloat(savedTime);
        }
        videoRef.current?.play().catch(() => console.log("Ожидание взаимодействия с пользователем"));
      };

      const videoEl = videoRef.current;
      videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [currentLesson, activeCourse, currentView]);

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

  // Умный скролл: скрытие поиска при прокрутке вниз, показ при прокрутке вверх
  const handleContentScroll = (e) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    
    if (currentScrollTop > lastScrollTop.current && currentScrollTop > 70) {
      setShowSearch(false);
    } else if (currentScrollTop < lastScrollTop.current) {
      setShowSearch(true);
    }
    lastScrollTop.current = currentScrollTop;
  };

  // =========================================================================
  // ЭКРАН 1: Дашборд курсов (Главная)
  // =========================================================================
  if (currentView === 'dashboard' || !activeCourse) {
    return (
      <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <h1 style={{ 
            display: 'inline-block',
            margin: '0 0 40px 0', 
            fontSize: '24px', 
            padding: '12px 32px', 
            border: '2px solid #475569', 
            borderRadius: '9999px',
            backgroundColor: 'transparent',
            color: '#e2e8f0',
            fontWeight: '600'
          }}>
            Мое обучение
          </h1>
          
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
              <h2>Курсы не найдены</h2>
              <p style={{ color: '#94a3b8' }}>Запустите скрипт <code>py generate_course.py</code> для синхронизации с Google Диском.</p>
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
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                        {progress}% материалов пройдено
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '14px' }}>
                      <button 
                        onClick={() => startCoursePlayer(course)}
                        style={{ backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                      >
                        Продолжить
                      </button>

                      <button 
                        onClick={() => openCourseContent(course)}
                        style={{ backgroundColor: 'transparent', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.backgroundColor = '#334155'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        Содержание курса
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

  // =========================================================================
  // ЭКРАН 2: Страница "Содержание курса"
  // =========================================================================
  if (currentView === 'content') {
    const filteredModules = activeCourse.modules.map(mod => {
      const matchingLessons = mod.lessons.filter(lesson => 
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...mod, lessons: matchingLessons };
    }).filter(mod => mod.lessons.length > 0 || searchQuery === '');

    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#f8fafc' }}>
        
        <aside style={{ width: '360px', minWidth: '360px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '30px' }}>
          <button 
            onClick={() => setCurrentView('dashboard')}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', cursor: 'pointer', padding: 0, marginBottom: '24px', fontWeight: '500' }}
          >
            ◀ Вернуться к списку курсов
          </button>

          <h2 style={{ fontSize: '22px', margin: '0 0 ' + (totalLessonsCount > 0 ? '16px' : '0') + ' 0', color: '#ffffff', lineHeight: '1.3' }}>
            {customNames[activeCourse.id] || activeCourse.originalTitle}
          </h2>

          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>
            Прогресс: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{progressPercentage}% материалов пройдено</span>
          </div>

          <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} />
          </div>

          <button 
            onClick={() => startCoursePlayer(activeCourse)}
            style={{ width: '100%', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s', marginTop: 'auto' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
          >
            Продолжить обучение
          </button>
        </aside>

        <main 
          onScroll={handleContentScroll}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          <div style={{
            position: 'sticky',
            top: showSearch ? '0' : '-100px',
            left: 0,
            right: 0,
            backgroundColor: '#0f172a',
            padding: '24px 40px',
            borderBottom: '1px solid #334155',
            zIndex: 10,
            transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <input 
              type="text"
              placeholder="Начните вводить название модуля или урока для поиска..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '10px', padding: '14px 20px', color: '#ffffff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#475569'}
            />
          </div>

          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {filteredModules.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px', fontSize: '16px' }}>Ничего не найдено по вашему запросу</div>
            ) : (
              filteredModules.map((mod) => {
                const isModuleDone = mod.lessons.length > 0 && mod.lessons.every(l => completedLessons[l.id]);

                return (
                  <div key={mod.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isModuleDone ? '#22c55e' : '#475569', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>
                        {isModuleDone ? "✓" : "•"}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: isModuleDone ? '#4ade80' : '#e2e8f0' }}>{mod.title}</h3>
                    </div>

                    <div>
                      {mod.lessons.map((lesson) => {
                        const isLessonDone = !!completedLessons[lesson.id];

                        return (
                          <div 
                            key={lesson.id}
                            onClick={() => startCoursePlayer(activeCourse, lesson)}
                            style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #2d3748', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: 'transparent' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div 
                              onClick={(e) => toggleLessonCompletion(lesson.id, e)}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', border: isLessonDone ? 'none' : '2px solid #64748b', backgroundColor: isLessonDone ? '#22c55e' : 'transparent', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}
                            >
                              {isLessonDone && "✓"}
                            </div>
                            <span style={{ fontSize: '15px', color: isLessonDone ? '#a7f3d0' : '#cbd5e1', transition: 'color 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lesson.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // ЭКРАН 3: Видеоплеер курса
  // =========================================================================
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      
      <aside style={{ width: '380px', minWidth: '380px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
            <button onClick={() => setCurrentView('dashboard')} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#94a3b8' } onMouseOut={(e) => e.currentTarget.style.borderColor = '#475569' }>◀ Главная</button>
            <button onClick={() => setCurrentView('content')} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#94a3b8' } onMouseOut={(e) => e.currentTarget.style.borderColor = '#475569' }>☰ Содержание</button>
          </div>

          <h2 style={{ fontSize: '18px', margin: '0 0 ' + (totalLessonsCount > 0 ? '16px' : '0') + ' 0', color: '#f8fafc', lineHeight: '1.4' }}>
            {customNames[activeCourse.id] || activeCourse.originalTitle}
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
            <span>Прогресс курса:</span>
            <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{progressPercentage}%</span>
          </div>

          <div style={{ width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {activeCourse.modules.map((mod) => (
            <div key={mod.id} style={{ marginBottom: '16px' }}>
              <div style={{ padding: '10px 24px', fontSize: '13px', fontWeight: '700', color: '#94a3b8', backgroundColor: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {mod.title}
              </div>
              <div>
                {mod.lessons.map((lesson) => {
                  const isActive = currentLesson && currentLesson.id === lesson.id;
                  const isDone = !!completedLessons[lesson.id];
                  
                  return (
                    <div key={lesson.id} onClick={() => setCurrentLesson(lesson)} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', cursor: 'pointer', backgroundColor: isActive ? '#334155' : 'transparent', borderLeft: isActive ? '4px solid #22c55e' : '4px solid transparent', transition: 'background-color 0.2s', color: isActive ? '#ffffff' : '#cbd5e1' }}>
                      <div onClick={(e) => toggleLessonCompletion(lesson.id, e)} style={{ width: '18px', height: '18px', borderRadius: '6px', border: isDone ? 'none' : '2px solid #64748b', backgroundColor: isDone ? '#22c55e' : 'transparent', marginRight: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
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

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {currentLesson ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff', margin: 0 }}>{currentLesson.title}</h1>
              <button 
                onClick={handleMediaEnded}
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => {e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0';}}
                onMouseOut={(e) => {e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8';}}
              >
                Отметить пройденным
              </button>
            </div>
            
            <div style={{ flex: 1, backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <iframe 
                src={currentLesson.url} 
                width="100%" 
                height="100%" 
                style={{ border: 'none' }}
                allow="autoplay; fullscreen"
              />
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