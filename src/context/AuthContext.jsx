import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isLiveMode } from '../database/supabaseClient';
import { mockDb } from '../database/mockDb';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [reducedMotion, setReducedMotion] = useState(false);

  // Apply Theme & Reduced Motion to document element
  useEffect(() => {
    const savedTheme = localStorage.getItem('edutrack_theme') || 'dark';
    setTheme(savedTheme);
    const root = window.document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(savedTheme);
    // Apply body classes
    document.body.className = savedTheme === 'dark' ? 'bg-dark-aurora text-slate-100' : 'bg-light-aurora text-slate-800';

    const savedReducedMotion = localStorage.getItem('edutrack_reduced_motion') === 'true';
    setReducedMotion(savedReducedMotion);
    if (savedReducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [theme]);

  // Load active session
  useEffect(() => {
    const initSession = async () => {
      if (isLiveMode && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchSupabaseProfile(session.user);
        } else {
          loadMockSession();
        }
      } else {
        loadMockSession();
      }
      setLoading(false);
    };
    initSession();
  }, []);

  const loadMockSession = () => {
    const cached = localStorage.getItem('edutrack_auth_user');
    if (cached) {
      const data = JSON.parse(cached);
      setUser(data.user);
      setStudent(data.student);
      setParent(data.parent);
      setTeacher(data.teacher);
    }
  };

  const fetchSupabaseProfile = async (authUser) => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        if (profile.role === 'student') {
          const { data: s } = await supabase.from('students').select('*').eq('id', profile.id).single();
          setStudent(s);
        } else if (profile.role === 'parent') {
          const { data: p } = await supabase.from('parents').select('*').eq('id', profile.id).single();
          setParent(p);
        } else if (profile.role === 'teacher') {
          const { data: t } = await supabase.from('teachers').select('*').eq('id', profile.id).single();
          setTeacher(t);
        }
      }
    } catch (err) {
      console.error("Error fetching profile from Supabase:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('edutrack_theme', nextTheme);
  };

  const toggleReducedMotion = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    localStorage.setItem('edutrack_reduced_motion', String(nextVal));
    const root = window.document.documentElement;
    if (nextVal) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  };

  const login = async (email, password, regNumber = null) => {
    setLoading(true);
    try {
      if (isLiveMode && supabase && !regNumber) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await fetchSupabaseProfile(data.user);
        setLoading(false);
        return { error: null };
      } else {
        // Mock DB login
        const { data, error } = await mockDb.login(email, password, regNumber);
        if (error) throw new Error(error);

        setUser(data.user);
        setStudent(data.student);
        setParent(data.parent);
        setTeacher(data.teacher);

        localStorage.setItem('edutrack_auth_user', JSON.stringify(data));
        setLoading(false);
        return { error: null };
      }
    } catch (err) {
      setLoading(false);
      return { error: err.message || "Authentication failed" };
    }
  };

  const signup = async (name, email, password, role, extra = {}) => {
    setLoading(true);
    try {
      if (isLiveMode && supabase) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Insert profile details in Supabase
        const { error: profileErr } = await supabase.from('users').insert({
          id: data.user.id,
          name,
          email,
          role,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        });
        if (profileErr) throw profileErr;

        if (role === 'student') {
          const reg = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;
          await supabase.from('students').insert({
            id: data.user.id,
            registration_number: reg,
            class_name: extra.className || 'Grade 10-A',
            parent_email: extra.parentEmail || ''
          });
        } else if (role === 'parent') {
          await supabase.from('parents').insert({
            id: data.user.id,
            student_id: extra.studentId || null
          });
        } else if (role === 'teacher') {
          await supabase.from('teachers').insert({
            id: data.user.id,
            department: extra.department || 'Science'
          });
        }

        await fetchSupabaseProfile(data.user);
        setLoading(false);
        return { error: null };
      } else {
        // Mock Signup
        const { data, error } = await mockDb.signup(name, email, role, extra);
        if (error) throw new Error(error);

        const cachedMockUser = {
          user: data.user,
          student: data.student,
          parent: data.parent,
          teacher: data.teacher
        };

        setUser(cachedMockUser.user);
        setStudent(cachedMockUser.student);
        setParent(cachedMockUser.parent);
        setTeacher(cachedMockUser.teacher);

        localStorage.setItem('edutrack_auth_user', JSON.stringify(cachedMockUser));
        setLoading(false);
        return { error: null };
      }
    } catch (err) {
      setLoading(false);
      return { error: err.message };
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isLiveMode && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setStudent(null);
    setParent(null);
    setTeacher(null);
    localStorage.removeItem('edutrack_auth_user');
    setLoading(false);
  };

  const refreshUserData = async () => {
    if (!user) return;
    if (isLiveMode && supabase) {
      await fetchSupabaseProfile(user);
    } else {
      loadMockSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, student, parent, teacher, loading, theme, reducedMotion, login, signup, logout, toggleTheme, toggleReducedMotion, refreshUserData, isLiveMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
