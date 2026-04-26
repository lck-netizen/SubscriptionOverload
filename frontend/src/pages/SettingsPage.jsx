import { useState, useEffect } from 'react';
import { profileService, budgetService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/helpers';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile data
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState({
    displayName: '',
    notificationEmail: '',
    customFooter: '',
  });

  // Budget
  const [budget, setBudget] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileData, budgetData] = await Promise.all([
        profileService.get(),
        budgetService.get(),
      ]);

      setProfile({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        phone: profileData.phone || '',
        country: profileData.country || '',
      });

      setEmailPrefs({
        displayName: profileData.emailPreferences?.displayName || '',
        notificationEmail: profileData.emailPreferences?.notificationEmail || '',
        customFooter: profileData.emailPreferences?.customFooter || '',
      });

      setBudget(budgetData.monthly_limit > 0 ? String(budgetData.monthly_limit) : '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await profileService.update(profile);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailPrefs = async () => {
    setSaving(true);
    try {
      await profileService.update({ emailPreferences: emailPrefs });
      alert('Email preferences updated successfully!');
    } catch (error) {
      alert('Failed to update email preferences');
    } finally {
      setSaving(false);
    }
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      await budgetService.update({ monthly_limit: Number(budget) || 0 });
      alert('Budget saved successfully!');
    } catch (error) {
      alert('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Information */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Read-only)
              </label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="input-field bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="input-field"
                  placeholder="+91 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="input-field"
                  placeholder="India"
                />
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Email Preferences */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Email Preferences</h2>
          <p className="text-sm text-gray-600 mb-4">
            Customize how you receive email notifications
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name (Used in emails)
              </label>
              <input
                type="text"
                value={emailPrefs.displayName}
                onChange={(e) => setEmailPrefs({ ...emailPrefs, displayName: e.target.value })}
                className="input-field"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Email
              </label>
              <input
                type="email"
                value={emailPrefs.notificationEmail}
                onChange={(e) => setEmailPrefs({ ...emailPrefs, notificationEmail: e.target.value })}
                className="input-field"
                placeholder="your-email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Footer Message
              </label>
              <textarea
                value={emailPrefs.customFooter}
                onChange={(e) => setEmailPrefs({ ...emailPrefs, customFooter: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Optional message to appear in email footer"
              />
            </div>

            <button
              onClick={saveEmailPrefs}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Email Preferences'}
            </button>
          </div>
        </div>

        {/* Budget */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Budget</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set your monthly spending limit. You'll be alerted when you exceed it.
          </p>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 bg-white">
                <span className="text-gray-600 mr-2">₹</span>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="flex-1 outline-none"
                  placeholder="e.g. 2000"
                />
              </div>
            </div>
            <button
              onClick={saveBudget}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>

          {budget && Number(budget) > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              Current limit: <span className="font-semibold text-gray-900">{formatCurrency(budget)}/month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
