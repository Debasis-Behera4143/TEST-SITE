import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isLiveMode } from '../database/supabaseClient';
import { mockDb } from '../database/mockDb';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [reducedMotion, setReducedMotion] = useState(false);

  // Google Onboarding states
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingAuthUser, setOnboardingAuthUser] = useState(null);
  const [authError, setAuthError] = useState('');

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

  const insertUserProfile = async (profileData) => {
    const { error } = await supabase.from('users').insert(profileData);
    if (error) {
      if (error.message && (error.message.includes('avatar_url') || error.message.includes('column'))) {
        const { avatar_url, ...rest } = profileData;
        const { error: retryError } = await supabase.from('users').insert(rest);
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }
  };

  const fetchSupabaseProfile = async (authUser) => {
    try {
      setAuthError('');
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        if (profile.role === 'student') {
          const { data: s } = await supabase.from('students').select('*').eq('id', profile.id).single();
          if (!s) {
            setAuthError("Account setup incomplete. Please contact support.");
            setUser(null);
            return;
          }
          setStudent(s);
        } else if (profile.role === 'parent') {
          const { data: p } = await supabase.from('parents').select('*').eq('id', profile.id).single();
          if (!p) {
            setAuthError("Account setup incomplete. Please contact support.");
            setUser(null);
            return;
          }
          setParent(p);
        } else if (profile.role === 'teacher') {
          const { data: t } = await supabase.from('teachers').select('*').eq('id', profile.id).single();
          if (!t) {
            setAuthError("Account setup incomplete. Please contact support.");
            setUser(null);
            return;
          }
          setTeacher(t);
        }
        setUser(profile);
        setNeedsOnboarding(false);
        setOnboardingAuthUser(null);
      } else {
        // Trigger onboarding for first-time Google Sign-In
        setNeedsOnboarding(true);
        setOnboardingAuthUser(authUser);
        setUser(null);
        setStudent(null);
        setParent(null);
        setTeacher(null);
      }
    } catch (err) {
      console.error("Error fetching profile from Supabase:", err);
      setAuthError("Authentication system error. Please contact support.");
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
        await insertUserProfile({
          id: data.user.id,
          name,
          email,
          role,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        });

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
      let errMsg = err.message;
      if (errMsg && errMsg.toLowerCase().includes('rate limit')) {
        errMsg = "Supabase signup rate limit exceeded. Please increase or disable the signup rate limit in your Supabase Dashboard under: Project Settings ➔ Auth ➔ Rate Limits (under 'Email Rate Limit'), or run the app in Local Mode.";
      }
      return { error: errMsg };
    }
  };

  const registerStudentByTeacher = async (name, email, password, className, parentEmail = '') => {
    try {
      if (isLiveMode && supabase) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false }
        });

        const { data, error } = await tempClient.auth.signUp({ email, password });
        if (error) throw error;

        // Insert profile details in Supabase
        await insertUserProfile({
          id: data.user.id,
          name,
          email,
          role: 'student',
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        });

        const reg = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;
        const { error: studentErr } = await supabase.from('students').insert({
          id: data.user.id,
          registration_number: reg,
          class_name: className || 'Grade 10-A',
          parent_email: parentEmail
        });
        if (studentErr) throw studentErr;

        return { data: { registrationNumber: reg }, error: null };
      } else {
        // Mock DB Signup without setting local session
        const { data, error } = await mockDb.signup(name, email, 'student', { className, parentEmail });
        if (error) throw new Error(error);
        return { data: { registrationNumber: data.student.registration_number }, error: null };
      }
    } catch (err) {
      let errMsg = err.message;
      if (errMsg && errMsg.toLowerCase().includes('rate limit')) {
        errMsg = "Supabase signup rate limit exceeded. Please increase or disable the signup rate limit in your Supabase Dashboard under: Project Settings ➔ Auth ➔ Rate Limits (under 'Email Rate Limit'), or run the app in Local Mode.";
      }
      return { data: null, error: errMsg };
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

  const loginWithGoogle = async (role = 'student') => {
    setLoading(true);
    try {
      if (isLiveMode && supabase) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setLoading(false);
        return { error: null };
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const email = `google.user@gmail.com`;
        const name = `Google User`;
        
        const db = JSON.parse(localStorage.getItem('edutrack_mock_db')) || { users: [], students: [], teachers: [] };
        let existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          const student = db.students.find(s => s.id === existingUser.id) || null;
          const teacher = db.teachers.find(t => t.id === existingUser.id) || null;
          const parent = db.parents.find(p => p.id === existingUser.id) || null;

          if (existingUser.role === 'student' && !student) {
            setAuthError("Account setup incomplete. Please contact support.");
            setLoading(false);
            return { error: "Account setup incomplete. Please contact support." };
          }
          if (existingUser.role === 'teacher' && !teacher) {
            setAuthError("Account setup incomplete. Please contact support.");
            setLoading(false);
            return { error: "Account setup incomplete. Please contact support." };
          }

          setUser(existingUser);
          setStudent(student);
          setTeacher(teacher);
          setParent(parent);

          localStorage.setItem('edutrack_auth_user', JSON.stringify({ user: existingUser, student, teacher, parent }));
          setNeedsOnboarding(false);
          setOnboardingAuthUser(null);
          setLoading(false);
          return { error: null };
        } else {
          setNeedsOnboarding(true);
          setOnboardingAuthUser({
            email,
            user_metadata: { full_name: name }
          });
          setUser(null);
          setStudent(null);
          setTeacher(null);
          setLoading(false);
          return { error: null };
        }
      }
    } catch (err) {
      setLoading(false);
      return { error: err.message };
    }
  };

  const completeGoogleOnboarding = async (role, extra = {}) => {
    setLoading(true);
    try {
      if (isLiveMode && supabase) {
        if (!onboardingAuthUser) throw new Error("No active onboarding session found.");

        const name = onboardingAuthUser.user_metadata?.full_name || onboardingAuthUser.email.split('@')[0];
        const email = onboardingAuthUser.email;
        const id = onboardingAuthUser.id;

        await insertUserProfile({
          id,
          name,
          email,
          role,
          avatar_url: onboardingAuthUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`
        });

        if (role === 'student') {
          const reg = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;
          const { error: studentErr } = await supabase.from('students').insert({
            id,
            registration_number: reg,
            class_name: extra.className || 'Grade 10-A',
            parent_email: extra.parentEmail || ''
          });
          if (studentErr) throw studentErr;
        } else if (role === 'teacher') {
          const { error: teacherErr } = await supabase.from('teachers').insert({
            id,
            department: extra.department || 'Science'
          });
          if (teacherErr) throw teacherErr;
        }

        await fetchSupabaseProfile(onboardingAuthUser);
        setLoading(false);
        return { error: null };
      } else {
        if (!onboardingAuthUser) throw new Error("No active onboarding session found.");
        const name = onboardingAuthUser.user_metadata?.full_name || onboardingAuthUser.email.split('@')[0];
        const email = onboardingAuthUser.email;

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
        setNeedsOnboarding(false);
        setOnboardingAuthUser(null);
        setLoading(false);
        return { error: null };
      }
    } catch (err) {
      setLoading(false);
      let errMsg = err.message;
      if (errMsg && errMsg.toLowerCase().includes('rate limit')) {
        errMsg = "Supabase signup rate limit exceeded. Please increase or disable the signup rate limit in your Supabase Dashboard under: Project Settings ➔ Auth ➔ Rate Limits, or run the app in Local Mode.";
      }
      return { error: errMsg };
    }
  };

  const sendOtp = async (email) => {
    try {
      if (isLiveMode && supabase) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false
          }
        });
        if (error) throw error;
        return { data: 'live', error: null };
      } else {
        const { data, error } = await mockDb.sendOtpForRecovery(email);
        if (error) throw new Error(error);
        return { data, error: null };
      }
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const verifyOtpAndReset = async (email, otp, newPassword) => {
    try {
      if (isLiveMode && supabase) {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        if (verifyErr) throw verifyErr;

        const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updateErr) throw updateErr;

        return { error: null };
      } else {
        const { error } = await mockDb.verifyAndResetPassword(email, otp, newPassword);
        if (error) throw new Error(error);
        return { error: null };
      }
    } catch (err) {
      return { error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, student, parent, teacher, loading, theme, reducedMotion, login, signup, logout, toggleTheme, toggleReducedMotion, refreshUserData, isLiveMode, loginWithGoogle, sendOtp, verifyOtpAndReset, registerStudentByTeacher, needsOnboarding, onboardingAuthUser, authError, completeGoogleOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
