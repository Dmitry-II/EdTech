import { useState, useRef, useEffect } from 'react';
import { courseData } from './courseData';

function App() {
  const hasData = courseData && courseData.length > 0;

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      if (mobile) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeCourse, setActiveCourse] = useState(null);

  const [customNames, setCustomNames] = useState(() => {
    const saved = localStorage.getItem('course_custom_names');
    return saved ? JSON.parse(saved) : {};
  });
  const [completedLessons, setCompletedLessons] = useState(() => {
    const saved = localStorage.getItem('course_completed_lessons');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('course_notes');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentNoteText, setCurrentNoteText] = useState('');

  const [currentLesson, setCurrentLesson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true);
  
  const lastScrollTop = useRef(0);
  const videoRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('course_custom_names', JSON.stringify(customNames));
  }, [customNames]);

  useEffect(() => {
    localStorage.setItem('course_completed_lessons', JSON.stringify(completedLessons));
  }, [completedLessons]);

  useEffect(() => {
    localStorage.setItem('course_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (currentLesson) {
      setCurrentNoteText(notes[currentLesson.id]?.text || '');
    }
  }, [currentLesson, notes]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [currentNoteText]);

  const openCourseContent = (course) => {
    setActiveCourse(course);
    setCurrentView('content');
    setSearchQuery('');
    setShowSearch(true);
    lastScrollTop.current = 0;
    if (isMobile) window.scrollTo(0, 0);
  };

  const startCoursePlayer = (course, specifiedLesson = null) => {
    setActiveCourse(course);
    setCurrentView('player');
    if (isMobile) setIsSidebarOpen(false);
    
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

  useEffect(() => {
    if (!currentLesson || !activeCourse || currentView !== 'player') return;

    localStorage.setItem(`last_watched_${activeCourse.id}`, currentLesson.id);
    const savedTime = localStorage.getItem(`course_time_${currentLesson.id}`);
    
    if (videoRef.current) {
      videoRef.current.src = currentLesson.url;
      videoRef.current.load();
      if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
      videoRef.current.play().catch(() => console.log("Ожидание клика для старта"));
    }
  }, [currentLesson, activeCourse, currentView]);

  const handleTimeUpdate = () => {
    if (videoRef.current && currentLesson) {
      localStorage.setItem(`course_time_${currentLesson.id}`, videoRef.current.currentTime);
    }
  };

  const goToNextLesson = () => {
    if (!currentLesson || !activeCourse) return;
    const allLessons = activeCourse.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
    
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      setCurrentLesson(allLessons[currentIndex + 1]);
    }
  };

  const handleMediaEnded = () => {
    if (!currentLesson || !activeCourse) return;
    setCompletedLessons(prev => ({ ...prev, [currentLesson.id]: true }));
    goToNextLesson();
  };

  const markAsCompletedAndNext = () => {
    if (!currentLesson) return;
    setCompletedLessons(prev => ({ ...prev, [currentLesson.id]: true }));
    goToNextLesson();
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

  const saveNote = () => {
    if (!currentLesson || !activeCourse) return;
    const newNotes = { ...notes };
    
    if (currentNoteText.trim() === '') {
      delete newNotes[currentLesson.id];
    } else {
      newNotes[currentLesson.id] = {
        text: currentNoteText,
        date: new Date().toISOString(),
        courseId: activeCourse.id,
        lessonId: currentLesson.id,
        lessonTitle: currentLesson.title,
        courseTitle: customNames[activeCourse.id] || activeCourse.originalTitle
      };
    }
    setNotes(newNotes);
  };

  const deleteNote = (lessonId) => {
    if (window.confirm("Удалить эту заметку?")) {
      const newNotes = { ...notes };
      delete newNotes[lessonId];
      setNotes(newNotes);
      if (currentLesson && currentLesson.id === lessonId) {
        setCurrentNoteText('');
      }
    }
  };

  const playFromNote = (courseId, lessonId) => {
    const course = courseData.find(c => c.id === courseId);
    if (!course) return;
    const allLessons = course.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []);
    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson) startCoursePlayer(course, lesson);
  };

  const handleContentScroll = (e) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (currentScrollTop > lastScrollTop.current && currentScrollTop > 70) {
      setShowSearch(false);
    } else if (currentScrollTop < lastScrollTop.current) {
      setShowSearch(true);
    }
    lastScrollTop.current = currentScrollTop;
  };

  if (currentView === 'dashboard' || (!activeCourse && currentView !== 'notes')) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: isMobile ? '20px' : '40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <h1 style={{ display: 'inline-flex', alignItems: 'center', margin: '0', fontSize: '24px', padding: '12px 32px', border: '2px solid #475569', borderRadius: '9999px', color: '#e2e8f0', fontWeight: '600', lineHeight: '1.2' }}>
              Мое обучение
            </h1>
            
            <button 
              onClick={() => setCurrentView('notes')}
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0', 
                fontSize: '24px', padding: '12px 32px', border: '2px solid #38bdf8', 
                backgroundColor: 'transparent', borderRadius: '9999px', color: '#38bdf8', 
                fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', lineHeight: '1.2'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#38bdf8'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#38bdf8'; }}
            >
              📝 Мои заметки
            </button>
          </div>
          
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
              <h2>Курсы не найдены</h2>
              <p style={{ color: '#94a3b8' }}>Поместите папки с курсами в <code>public/courses/</code>.</p>
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
                  <div key={course.id} style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: isMobile ? '20px' : '30px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <button onClick={(e) => renameCourse(course.id, course.originalTitle, e)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }} title="Переименовать">✏️</button>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', color: '#f8fafc', paddingRight: '40px' }}>{displayName}</h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <button onClick={(e) => resetCourseProgress(course, e)} style={{ background: 'none', border: 'none', padding: 0, color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>Сброс прогресса</button>
                    </div>
                    
                    <div style={{ marginBottom: '24px', width: '100%' }}>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>{progress}% материалов пройдено</div>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <button onClick={() => startCoursePlayer(course)} style={{ flex: isMobile ? '1 1 100%' : 'none', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Продолжить
                      </button>
                      <button onClick={() => openCourseContent(course)} style={{ flex: isMobile ? '1 1 100%' : 'none', backgroundColor: 'transparent', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
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

  if (currentView === 'notes') {
    const sortedNotesList = Object.values(notes).sort((a, b) => new Date(b.date) - new Date(a.date));
    const groupedNotes = [];
    let currentGroup = null;

    sortedNotesList.forEach(note => {
      const dateStr = new Date(note.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, items: [] };
        groupedNotes.push(currentGroup);
      }
      currentGroup.items.push(note);
    });

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: isMobile ? '20px' : '40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
          <button onClick={() => setCurrentView('dashboard')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', cursor: 'pointer', padding: 0, marginBottom: '32px', fontWeight: '500' }}>
            ◀ Вернуться к курсам
          </button>

          <h1 style={{ fontSize: '32px', margin: '0 0 40px 0', color: '#ffffff', fontWeight: '700' }}>Мои заметки</h1>

          {groupedNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px dashed #475569' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
              <h2 style={{ margin: '0 0 8px 0' }}>У вас пока нет заметок</h2>
              <p style={{ color: '#94a3b8' }}>Оставляйте таймкоды и важные мысли к роликам, они появятся здесь.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {groupedNotes.map((group, i) => (
                <div key={i}>
                  <h3 style={{ fontSize: '18px', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '20px' }}>{group.date}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {group.items.map((note, j) => (
                      <div key={j} style={{ position: 'relative', backgroundColor: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button onClick={() => deleteNote(note.lessonId)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>🗑️</button>
                        
                        <div style={{ paddingRight: '32px' }}>
                          <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>{note.courseTitle}</div>
                          <h4 
                            onClick={() => playFromNote(note.courseId, note.lessonId)}
                            style={{ margin: '0', fontSize: '18px', color: '#f8fafc', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#38bdf8'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#f8fafc'}
                          >
                            {note.lessonTitle}
                            <span style={{ fontSize: '14px', color: '#38bdf8' }}>↗</span>
                          </h4>
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const allCurrentCourseLessons = activeCourse ? activeCourse.modules.reduce((acc, curr) => [...acc, ...curr.lessons], []) : [];
  const totalLessonsCount = allCurrentCourseLessons.length;
  const completedCount = allCurrentCourseLessons.filter(l => completedLessons[l.id]).length;
  const progressPercentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  if (currentView === 'content') {
    const filteredModules = activeCourse.modules.map(mod => {
      const matchingLessons = mod.lessons.filter(lesson => 
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...mod, lessons: matchingLessons };
    }).filter(mod => mod.lessons.length > 0 || searchQuery === '');

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
        <aside style={{ width: isMobile ? '100%' : '360px', minWidth: isMobile ? '100%' : '360px', backgroundColor: '#1e293b', borderRight: isMobile ? 'none' : '1px solid #334155', borderBottom: isMobile ? '1px solid #334155' : 'none', display: 'flex', flexDirection: 'column', padding: isMobile ? '20px' : '30px', zIndex: 11 }}>
          <button onClick={() => setCurrentView('dashboard')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', cursor: 'pointer', padding: 0, marginBottom: '24px', fontWeight: '500' }}>
            ◀ Вернуться к списку курсов
          </button>
          <h2 style={{ fontSize: '22px', margin: '0 0 ' + (totalLessonsCount > 0 ? '16px' : '0') + ' 0', color: '#ffffff', lineHeight: '1.3' }}>
            {customNames[activeCourse.id] || activeCourse.originalTitle}
          </h2>
          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Прогресс - <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{progressPercentage}%</span></div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} />
          </div>
          <button onClick={() => startCoursePlayer(activeCourse)} style={{ width: '100%', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: isMobile ? '0' : 'auto' }}>
            Продолжить обучение
          </button>
        </aside>

        <main onScroll={handleContentScroll} style={{ flex: 1, overflowY: 'auto', display: 'block', position: 'relative', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ position: 'sticky', top: showSearch ? '0' : '-100px', backgroundColor: '#0f172a', padding: isMobile ? '16px 20px' : '24px 40px', borderBottom: '1px solid #334155', zIndex: 10, transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <input type="text" placeholder="Поиск уроков..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '10px', padding: '14px 20px', color: '#ffffff', fontSize: '16px', outline: 'none' }} />
          </div>

          <div style={{ padding: isMobile ? '20px' : '40px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {filteredModules.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px', fontSize: '16px' }}>Ничего не найдено</div>
            ) : (
              filteredModules.map((mod) => {
                const isModuleDone = mod.lessons.length > 0 && mod.lessons.every(l => completedLessons[l.id]);
                return (
                  <div key={mod.id} style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: isModuleDone ? '#22c55e' : '#475569', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>
                        {isModuleDone ? "✓" : "•"}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: isModuleDone ? '#4ade80' : '#e2e8f0' }}>{mod.title}</h3>
                    </div>
                    <div>
                      {mod.lessons.map((lesson) => {
                        const isLessonDone = !!completedLessons[lesson.id];
                        return (
                          <div key={lesson.id} onClick={() => startCoursePlayer(activeCourse, lesson)} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #2d3748', cursor: 'pointer' }}>
                            <div onClick={(e) => toggleLessonCompletion(lesson.id, e)} style={{ width: '20px', height: '20px', borderRadius: '50%', border: isLessonDone ? 'none' : '2px solid #64748b', backgroundColor: isLessonDone ? '#22c55e' : 'transparent', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
                              {isLessonDone && "✓"}
                            </div>
                            <span style={{ fontSize: '15px', color: isLessonDone ? '#a7f3d0' : '#cbd5e1' }}>{lesson.title}</span>
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

  const hasUnsavedNote = currentNoteText.trim() !== '' && currentNoteText !== (notes[currentLesson?.id]?.text || '');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      
      <aside style={{ 
        position: isMobile ? 'absolute' : 'relative',
        left: isMobile ? (isSidebarOpen ? '0' : '-100%') : '0',
        zIndex: 20,
        width: isMobile ? '85%' : '380px', 
        minWidth: isMobile ? '85%' : '380px', 
        backgroundColor: '#1e293b', 
        borderRight: '1px solid #334155', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        transition: 'left 0.3s ease-in-out',
        boxShadow: isMobile && isSidebarOpen ? '10px 0 25px rgba(0,0,0,0.5)' : 'none'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #334155', backgroundColor: '#0f172a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCurrentView('dashboard')} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>◀ Главная</button>
              <button onClick={() => setCurrentView('content')} style={{ backgroundColor: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>☰ Содержание</button>
            </div>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#f8fafc', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            )}
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
                    <div key={lesson.id} onClick={() => { setCurrentLesson(lesson); if(isMobile) setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', cursor: 'pointer', backgroundColor: isActive ? '#334155' : 'transparent', borderLeft: isActive ? '4px solid #22c55e' : '4px solid transparent', color: isActive ? '#ffffff' : '#cbd5e1' }}>
                      <div onClick={(e) => toggleLessonCompletion(lesson.id, e)} style={{ width: '18px', height: '18px', borderRadius: '6px', border: isDone ? 'none' : '2px solid #64748b', backgroundColor: isDone ? '#22c55e' : 'transparent', marginRight: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>
                        {isDone && "✓"}
                      </div>
                      <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{lesson.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {isMobile && isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 }} />
      )}

      <main style={{ flex: 1, display: 'block', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '60px' }}>
        {currentLesson ? (
          <div style={{ padding: isMobile ? '20px' : '40px' }}>
            
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer', fontSize: '14px' }}>
                ☰ Список уроков
              </button>
            )}

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0' }}>
              <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: '#ffffff', margin: 0, lineHeight: '1.3' }}>{currentLesson.title}</h1>
              
              <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                <button onClick={handleMediaEnded} style={{ flex: isMobile ? 1 : 'none', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', padding: isMobile ? '8px 12px' : '8px 16px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  Отметить пройденным
                </button>
                {isMobile && (
                  <button 
                    onClick={markAsCompletedAndNext} 
                    style={{ flex: isMobile ? 1 : 'none', backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap' }}
                  >
                    Далее ➔
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
              <video ref={videoRef} controls onTimeUpdate={handleTimeUpdate} onEnded={handleMediaEnded} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>

            <div style={{ marginTop: '24px', position: 'relative' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>Добавить заметку:</div>
                
                {!isMobile && (
                  <button 
                    onClick={markAsCompletedAndNext} 
                    style={{ backgroundColor: '#22c55e', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                  >
                    Следующий шаг ➔
                  </button>
                )}
              </div>

              <textarea 
                ref={textareaRef}
                rows={1}
                value={currentNoteText}
                onChange={(e) => setCurrentNoteText(e.target.value)}
                placeholder="Таймкоды, заметки..."
                style={{ 
                  width: '100%', 
                  background: 'transparent', 
                  border: 'none', 
                  borderBottom: '1px solid #475569',
                  color: '#e2e8f0', 
                  fontSize: '16px', 
                  padding: '4px 0 10px 0', 
                  outline: 'none', 
                  resize: 'none', 
                  overflow: 'hidden',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = '#38bdf8'}
                onBlur={(e) => e.currentTarget.style.borderBottomColor = '#475569'}
              />
              
              {hasUnsavedNote && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button 
                    onClick={saveNote} 
                    style={{ backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '6px', padding: '8px 24px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Сохранить
                  </button>
                </div>
              )}

              {notes[currentLesson.id] && !hasUnsavedNote && (
                <div style={{ position: 'relative', marginTop: '16px', backgroundColor: 'transparent', borderLeft: '3px solid #38bdf8', padding: '8px 32px 8px 16px', color: '#cbd5e1', fontSize: '15px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {notes[currentLesson.id].text}
                  <button onClick={() => deleteNote(currentLesson.id)} style={{ position: 'absolute', top: '8px', right: '0', background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>🗑️</button>
                </div>
              )}
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