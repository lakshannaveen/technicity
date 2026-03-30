
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserService from '../services/UserService';
import RepairmanService from '../services/RepairmanService';
import api from '../services/api';
import {
  Box,
  Grid,
  Card,
  Button,
  Chip
} from "@mui/material";
import { CircularProgress } from '@mui/material';

const RepairmanDashboard = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [stats, setStats] = useState({
    assignedRepairs: 0,
    completedToday: 0,
    waitingForParts: 0
  });
  const [availableRepairs, setAvailableRepairs] = useState([]);
  const [myRepairs, setMyRepairs] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMyRepairs = async (repairmanIdentifier) => {
    try {
      const isNumericId = repairmanIdentifier !== null && repairmanIdentifier !== undefined && !Number.isNaN(parseInt(repairmanIdentifier, 10)) && String(repairmanIdentifier).match(/^\d+$/);
      const idParam = isNumericId ? `repairman_id=${repairmanIdentifier}` : `rep_name=${encodeURIComponent(String(repairmanIdentifier || '').trim())}`;

      const [diagnosingRes, returnedRes] = await Promise.all([
        api.get(`/RepairTicket/GetDiagnosingRepairTickets?${idParam}`),
        api.get(`/RepairTicket/GetReturnedRepairTickets?${idParam}`)
      ]);

      const diagnosing = diagnosingRes?.data?.ResultSet || diagnosingRes?.data?.Result || [];
      const returned = returnedRes?.data?.ResultSet || returnedRes?.data?.Result || [];

      const diagnosingArray = Array.isArray(diagnosing) ? diagnosing : [];
      const returnedArray = Array.isArray(returned) ? returned : [];

      const combined = [...diagnosingArray, ...returnedArray].slice(0, 3);
      setMyRepairs(combined);
    } catch (error) {
      console.error('Failed to load My Repairs', error);
      setMyRepairs([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rawUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        let repairmanId = rawUser?.repairman_id;

        if (!repairmanId) {
          const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
          if (mobile) {
            try {
              const roleRes = await UserService.testGetUserRole(mobile);
              if (roleRes && roleRes.data) {
                const maybe = (roleRes.data.ResultSet && roleRes.data.ResultSet[0]) || roleRes.data.Result || roleRes.data;
                const candidates = [
                  maybe && maybe.RepairmanID,
                  maybe && maybe.RepairmanId,
                  maybe && maybe.repairman_id,
                  maybe && maybe.repairmanId,
                  maybe && maybe.user_id,
                  maybe && maybe.UserID,
                  maybe && maybe.userId,
                  maybe && maybe.id
                ];
                for (const c of candidates) {
                  if (c === undefined || c === null) continue;
                  const digits = String(c).replace(/[^0-9\-]/g, '');
                  const n = digits === '' ? null : parseInt(digits, 10);
                  if (n && !Number.isNaN(n)) { repairmanId = n; break; }
                }
              }
            } catch (e) { }
          }
        }

        if (mounted) {
          if (repairmanId) await loadMyRepairs(repairmanId);
          else await loadMyRepairs(rawUser.username || rawUser.name || rawUser.userName || '');
        }
      } catch (err) {
        console.warn('loadMyRepairs resolver failed', err);
      }
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const parseSummary = (data) => {
      if (!data) return null;
      const maybe = Array.isArray(data) && data.length > 0 ? data[0] : data.ResultSet && data.ResultSet[0] ? data.ResultSet[0] : data.Result || data;

      const extract = (obj, keys) => {
        for (const k of keys) {
          if (typeof obj[k] !== 'undefined' && obj[k] !== null) return Number(obj[k]) || 0;
        }
        return 0;
      };

      const assigned = extract(maybe, ['AssignedRepairs', 'assignedRepairs', 'assigned_repairs', 'Assigned', 'AssignedCount', 'AssignedRepairCount']);
      const completed = extract(maybe, ['CompletedToday', 'completedToday', 'completed_today', 'CompletedCount', 'Completed']);
      const waiting = extract(maybe, ['WaitingForParts', 'waitingForParts', 'waiting_for_parts', 'Waiting', 'WaitingCount']);

      return { assignedRepairs: assigned, completedToday: completed, waitingForParts: waiting };
    };

    const normalizeStatus = (s) => {
      const st = (s == null) ? '' : String(s).trim();
      const low = st.toLowerCase();
      if (low === 'w') return 'Waiting for Parts';
      if (low === 'i') return 'In Progress';
      if (low === 'c') return 'Completed';
      if (low === 'a' || low === 'approved') return 'Approved';
      if (low === 'r' || low === 'rejected') return 'Rejected';
      if (low === 'inprogress' || low === 'in progress') return 'In Progress';
      if (low.includes('waiting') && low.includes('part')) return 'Waiting for Parts';
      if (low === 'available' || low === '') return 'Available';
      return st || '';
    };

    // Resolve repairman identity ONCE before starting the polling loop.

    // Calling testGetUserRole on every poll cycle caused a race between the
    // local-first setState and async server responses arriving at different
    // speeds, which made the counter values flicker on each refresh.
    const resolveRepairmanId = async () => {
      try {
        const rawUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
        if (mobile) {
          const roleRes = await UserService.testGetUserRole(mobile);
          if (roleRes && roleRes.data) {
            const maybe = (roleRes.data.ResultSet && roleRes.data.ResultSet[0]) || roleRes.data.Result || roleRes.data;
            const candidates = [
              maybe && maybe.RepairmanID,
              maybe && maybe.RepairmanId,
              maybe && maybe.repairman_id,
              maybe && maybe.repairmanId,
              maybe && maybe.user_id,
              maybe && maybe.UserID,
              maybe && maybe.userId,
              maybe && maybe.id
            ];
            for (const c of candidates) {
              if (c === undefined || c === null) continue;
              const digits = String(c).replace(/[^0-9\-]/g, '');
              const n = digits === '' ? null : parseInt(digits, 10);
              if (n && !Number.isNaN(n)) return n;
            }
          }
        }
      } catch (e) { /* ignore — fall back to name */ }
      return null;
    };

    // repairmanId and repName are resolved once and reused in every poll.
    let resolvedRepairmanId = null;
    let resolvedRepName = sessionStorage.getItem('rep_name') || user?.username || '';

    // const loadData = async (repairmanId, repName) => {
    //   const storedTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
    //   const targetUser = String(user.username || '').trim().toLowerCase();
    //   const targetRepName = String(localStorage.getItem('rep_name') || '').trim().toLowerCase();

    //   const isMyAssigned = (t) => {
    //     const assigned = String(t.assignedTo || t.repName || t.rep_name || (t.raw && (t.raw.assignedTo || t.raw.assigned_to || t.raw.repairman || t.raw.rep_name || t.raw.repName)) || '').trim().toLowerCase();
    //     return assigned === targetUser || (targetRepName && assigned === targetRepName) || (assigned !== '' && targetUser.includes(assigned)) || (targetUser !== '' && assigned.includes(targetUser));
    //   };


    //   const myAssignedRepairs = storedTickets.filter(isMyAssigned);
    //   const availableRepairsData = storedTickets.filter(ticket => {
    //     const s = String(normalizeStatus(ticket.status || ticket.Status) || '').toLowerCase();
    //     const assigned = String(ticket.assignedTo || ticket.repName || ticket.rep_name || (ticket.raw && (ticket.raw.assignedTo || ticket.raw.assigned_to || ticket.raw.repairman || ticket.raw.rep_name || ticket.raw.repName)) || '').trim().toLowerCase();
    //     return s === 'available' || (s === 'diagnosing' && assigned === '') || (s === '' && assigned === '');
    //   });

    //   const completedToday = myAssignedRepairs.filter(ticket => {
    //     const s = normalizeStatus(ticket.status || ticket.Status);
    //     return s === 'Completed' && ticket.completedAt === new Date().toISOString().split('T')[0];
    //   }).length;
    //   const waitingForParts = myAssignedRepairs.filter(ticket => normalizeStatus(ticket.status || ticket.Status) === 'Waiting for Parts').length;



    //   // Only set local stats if server has not provided authoritative data yet.
    //   // Do NOT set from localStorage if we already have server data — this
    //   // prevents the local value from overwriting the server value on each poll.
    //   const localStats = {
    //     assignedRepairs: myAssignedRepairs.length,
    //     completedToday,
    //     waitingForParts
    //   };

    //   const fetchSummary = async () => {
    //     const username = String(user?.username || '').trim();
    //     const repNameProp = String(repName || localStorage.getItem('rep_name') || '').trim();
    //     const targets = [];
    //     if (repairmanId) targets.push(`repairman_id=${repairmanId}`);
    //     if (username) targets.push(`rep_name=${encodeURIComponent(username)}`);
    //     if (repNameProp && repNameProp !== username) targets.push(`rep_name=${encodeURIComponent(repNameProp)}`);

    //     for (const t of targets) {
    //       try {
    //         const url = `https://teknicitybackend.dockyardsoftware.com/RepairTicket/GetRepairmanWorkSummary?${t}`;
    //         const res = await api.get(url);
    //         if (res && res.data && (res.status === 200 || res.data.StatusCode === 200)) {
    //           let payload = null;
    //           if (Array.isArray(res.data.ResultSet)) payload = res.data.ResultSet;
    //           else if (res.data.ResultSet && typeof res.data.ResultSet === 'object') payload = res.data.ResultSet;
    //           else if (res.data.Result) payload = (typeof res.data.Result === 'string' ? JSON.parse(res.data.Result || 'null') : res.data.Result);
    //           else payload = res.data;

    //           const parsed = parseSummary(payload);
    //           if (parsed) return parsed;
    //         }
    //       } catch (e) { /* ignore */ }
    //     }

    //     return null;
    //   };

    //   try {
    //     const parsed = await fetchSummary();
    //     // Use server data if valid; otherwise fall back to local computation.
    //     if (parsed && mounted) {
    //       setStats(parsed);
    //     } else if (mounted) {
    //       setStats(localStats);
    //     }
    //   } catch (err) {
    //     console.warn('GetRepairmanWorkSummary failed', err && err.message ? err.message : err);
    //     // Server unavailable — use local computation as stable fallback.
    //     if (mounted) setStats(localStats);
    //   }

    //   if (mounted) {
    //     setAvailableRepairs(prev => (prev && prev.length > 0) ? prev : availableRepairsData.slice(0, 3));
    //     setMyRepairs(prev => (prev && prev.length > 0) ? prev : myAssignedRepairs.slice(0, 3));
    //   }
    // };


    const loadData = async (repairmanId, repName) => {
      setIsLoading(true);
      try {
    // 🔥 1. FETCH ALL TICKETS FROM API (NO localStorage)
    const res = await api.get('/RepairTicket/GetAllRepairTicket');

    let list = [];
    if (res?.data?.ResultSet) list = res.data.ResultSet;
    else if (res?.data?.Result) {
      try {
        list = typeof res.data.Result === 'string'
          ? JSON.parse(res.data.Result)
          : res.data.Result;
      } catch {
        list = res.data.Result;
      }
    }

    // 🔥 Normalize data
    const normalized = (list || []).map(item => ({
      id: item.ticket_id,
      brand: item.brand,
      issue: item.issue_description,
      customerName: item.customer_name,
      customerPhone: item.phone_no,
      status: item.status,
      repairman_id: item.repairman_id,
      repName: item.repairman_name,
      createdAt: item.created_date
    }));

    // ✅ AVAILABLE = repairman_id EMPTY
    const available = normalized.filter(t =>
      !t.repairman_id || t.repairman_id === ""
    );

    // ✅ MY REPAIRS
    const myRepairsData = normalized.filter(t =>
      String(t.repairman_id) === String(repairmanId) ||
      String(t.repName || '').toLowerCase() === String(repName || '').toLowerCase()
    );

    setAvailableRepairs(available.slice(0, 3));
    setMyRepairs(myRepairsData.slice(0, 3));

    // 🔥 LOCAL STATS (no API call loop)
    const completedToday = myRepairsData.filter(t =>
      t.status === 'C'
    ).length;

    const waitingForParts = myRepairsData.filter(t =>
      t.status === 'W'
    ).length;

    setStats({
      assignedRepairs: myRepairsData.length,
      completedToday,
      waitingForParts
    });

  } catch (err) {
    console.error('LoadData API error:', err);
  } finally {
    setIsLoading(false);
  }
};

    // Resolve identity once, then start polling with stable values.
    resolveRepairmanId().then(id => {
      resolvedRepairmanId = id;
      if (!mounted) return;
      loadData(resolvedRepairmanId, resolvedRepName);
      const interval = setInterval(() => {
        if (mounted) loadData(resolvedRepairmanId, resolvedRepName);
      }, 50000);
      // Store interval id so cleanup can cancel it.
      // (We reassign the outer cleanup to use this interval.)
      // eslint-disable-next-line no-use-before-define
      intervalRef = interval;
    });

    let intervalRef = null;
    return () => { mounted = false; if (intervalRef) clearInterval(intervalRef); };
  }, [user.username]);

  useEffect(() => {
    let mounted = true;
    const fetchName = async () => {
      try {
        const raw = JSON.parse(sessionStorage.getItem('user') || '{}');
        const mobile = (raw.phone || raw.mobile || raw.MobileNo || raw.Mobile || raw.mobileNo || '').toString().replace(/\D/g, '');
        if (!mobile) {
          setDisplayName(raw.username || raw.name || '');
          return;
        }

        const res = await UserService.testGetUserRole(mobile);
        if (!mounted || !res || !res.data) return;
        const maybe = (res.data.ResultSet && res.data.ResultSet[0]) || res.data.Result || res.data;
        const name = (maybe && (maybe.UserName || maybe.User || maybe.Name || maybe.name || maybe.displayName || maybe.fullName)) || '';
        if (name) setDisplayName(String(name));
        else setDisplayName(raw.username || raw.name || '');
      } catch (err) {
        const raw = JSON.parse(sessionStorage.getItem('user') || '{}');
        setDisplayName(raw.username || raw.name || '');
      }
    };

    fetchName();
    return () => { mounted = false; };
  }, []);

  const statsData = [
    {
      name: 'Assigned Repairs',
      value: stats.assignedRepairs.toString(),
      icon: '🔧',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Completed Today',
      value: stats.completedToday.toString(),
      icon: '✅',
      gradient: 'from-green-500 to-green-600'
    },
    {
      name: 'Waiting for Parts',
      value: stats.waitingForParts.toString(),
      icon: '⏳',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-l-4 border-green-500';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
      case 'Waiting for Parts': return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
      case 'Diagnosing': return 'bg-purple-100 text-purple-800 border-l-4 border-purple-500';
      default: return 'bg-gray-100 text-gray-800 border-l-4 border-gray-500';
    }
  };

  const claimRepair = async (ticketId) => {
    // First, ensure we have the logged-in username to send as rep_name
    const storedTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
    const ticket = storedTickets.find(t => t.id === ticketId);
    if (!ticket) {
      alert('Ticket not found');
      return;
    }

    const rawUser = user || {};
    // Try to resolve authoritative username from server (TestGetUserRole) when possible.
    // This ensures we send the same account name that the dashboard/header shows.
    let repName = '';
    const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
    if (mobile) {
      try {
        const roleRes = await UserService.testGetUserRole(mobile);
        if (roleRes && roleRes.data) {
          const maybe = (roleRes.data.ResultSet && roleRes.data.ResultSet[0]) || roleRes.data.Result || roleRes.data;
          const maybeName = (maybe && (maybe.UserName || maybe.User || maybe.name || maybe.displayName || maybe.fullName)) || '';
          if (maybeName) repName = String(maybeName).trim();
        }
      } catch (e) {
        // ignore and fall back to local values
      }
    }

    // If server lookup failed or not available, fall back to local stored display/username
    if (!repName) {
      repName = (rawUser.displayName || rawUser.UserName || rawUser.username || rawUser.name || rawUser.fullName || '').toString().trim();
    }

    // final fallback
    if (!repName) repName = 'unknown';

    // Persist resolved name to localStorage so UI/header and other pages stay in sync
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (repName && stored) {
        stored.UserName = stored.UserName || repName;
        stored.displayName = stored.displayName || repName;
        // also keep username field and a dedicated rep_name key for other pages
        stored.username = stored.username || repName;
        try { sessionStorage.setItem('rep_name', repName); } catch (e) { /* ignore */ }
        sessionStorage.setItem('user', JSON.stringify(stored));
      }
    } catch (e) {
      // ignore persistence failures
    }

    // 1) Resolve repairman_id and call UpdateRepairmanName with { ticket_id, repairman_id }
    const MAX_INT32 = 2147483647;
    const normalizeToInt = (v) => {
      if (v === undefined || v === null) return null;
      const digits = String(v).replace(/[^0-9\-]/g, '');
      if (digits === '') return null;
      const n = parseInt(digits, 10);
      if (Number.isNaN(n)) return null;
      if (Math.abs(n) > MAX_INT32) return null;
      return n;
    };

    let repairmanId = null;
    const mobileClean = mobile || '';

    // 2) Fallback to local `repairmen` cache
    if (!repairmanId) {
      try {
        const cached = JSON.parse(localStorage.getItem('repairmen') || '[]');
        if (Array.isArray(cached) && cached.length > 0) {
          const found = cached.find(r => {
            const names = [r.repairman_name, r.name, r.UserName, r.username, r.displayName].filter(Boolean).map(x => String(x).trim().toLowerCase());
            return names.includes(String(repName).trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobileClean)) || (r.phone && String(r.phone).replace(/\D/g, '') === String(mobileClean));
          });
          if (found) {
            const candidates = [found.RepairmanID, found.RepairmanId, found.repairman_id, found.id];
            for (const c of candidates) {
              const n = normalizeToInt(c);
              if (n) { repairmanId = n; break; }
            }
          }
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // 3) Fallback to server Repairman list
    if (!repairmanId) {
      try {
        const srv = await RepairmanService.GetAllRepairman();
        let list = [];
        if (srv && srv.data) {
          if (Array.isArray(srv.data.ResultSet) && srv.data.ResultSet.length > 0) list = srv.data.ResultSet;
          else if (srv.data.Result) {
            try { list = JSON.parse(srv.data.Result); } catch (e) { list = srv.data.Result; }
          } else if (Array.isArray(srv.data)) list = srv.data;
        }

        const foundSrv = (list || []).find(r => {
          const names = [r.repairman_name, r.name, r.UserName, r.username].filter(Boolean).map(x => String(x).trim().toLowerCase());
          return names.includes(String(repName).trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobileClean)) || (r.phone && String(r.phone).replace(/\D/g, '') === String(mobileClean));
        });

        if (foundSrv) {
          const candidates = [foundSrv.RepairmanID, foundSrv.RepairmanId, foundSrv.repairman_id, foundSrv.id];
          for (const c of candidates) {
            const n = normalizeToInt(c);
            if (n) { repairmanId = n; break; }
          }
        }
      } catch (e) {
        console.warn('RepairmanService.GetAllRepairman failed', e);
      }
    }

    if (!repairmanId) {
      alert(`Could not resolve a valid numeric repairman_id for '${repName}'.\nPlease ensure TestGetUserRole or GetAllRepairman returns the repairman id for your account.`);
      return;
    }

    // send `{ ticket_id, repairman_id }` to backend (form-encoded)
    try {
      const nameParams = new URLSearchParams();
      nameParams.append('ticket_id', String(ticketId));
      nameParams.append('repairman_id', String(repairmanId));

      const nameRes = await api.post('/RepairTicket/UpdateRepairmanName', nameParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!(nameRes && (nameRes.status === 200 || (nameRes.data && (nameRes.data.StatusCode === 200 || nameRes.data.status === 'success'))))) {
        const serverMsg = nameRes && nameRes.data ? (nameRes.data.Result || JSON.stringify(nameRes.data)) : 'Unexpected server response';
        alert(`UpdateRepairmanName failed: ${serverMsg}`);
        return;
      }
    } catch (err) {
      let serverDetail = '';
      if (err && err.response && err.response.data) {
        const d = err.response.data;
        serverDetail = d.Result || d.message || JSON.stringify(d);
      } else if (err && err.message) {
        serverDetail = err.message;
      }
      console.error('UpdateRepairmanName failed:', serverDetail || err);
      alert(`Failed to assign repairman: ${serverDetail || 'Unknown error'}`);
      return;
    }

    // 2) Update status to Diagnosing (so DB shows it's claimed)
    const assignedDate = new Date().toISOString().split('T')[0];

    const params = new URLSearchParams();
    params.append('ticket_id', String(ticketId));
    params.append('status', 'Diagnosing');
    params.append('repairman_id', String(repairmanId));
    if (repName) params.append('assignedTo', repName);
    params.append('assignedDate', assignedDate);

    try {
      const res = await api.post('/RepairTicket/UpdateRepairTicketStatus', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!(res && (res.status === 200 || (res.data && res.data.StatusCode === 200)))) {
        const serverMsg = res && res.data ? (res.data.Result || JSON.stringify(res.data)) : 'Unexpected server response';
        alert(`Server update failed: ${serverMsg}`);
        return;
      }

      // reload tickets from server to reflect authoritative DB state
      const listRes = await api.get('/RepairTicket/GetAllRepairTicket');
      if (listRes && listRes.data && (listRes.data.StatusCode === 200 || listRes.status === 200)) {
        let list = [];
        if (Array.isArray(listRes.data.ResultSet) && listRes.data.ResultSet.length > 0) list = listRes.data.ResultSet;
        else if (listRes.data.Result) {
          try { list = JSON.parse(listRes.data.Result); } catch (e) { list = listRes.data.Result; }
        }

        const normalized = (list || []).map(item => ({
          id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || Date.now(),
          brand: item.brand || item.device || item.device_brand || '',
          issue: item.issue_description || item.issue || '',
          customerName: item.customer_name || item.customer || '',
          customerPhone: item.customer_phone || item.customerPhone || '',
          status: item.status || item.Status || 'Available',
          barcodeValue: item.barcode || item.barcodeValue || `TKT${String(item.ticket_id || item.id || Date.now()).padStart(6, '0')}`,
          createdAt: item.createdAt || item.created_at || item.date || '',
          repName: item.repairman_name || item.repairman || item.assignedTo || ''
        }));

        localStorage.setItem('repairTickets', JSON.stringify(normalized));
        const availableRepairsData = normalized.filter(t => t.status === 'Available');
        setAvailableRepairs(availableRepairsData.slice(0, 3));

        // Optimistic UI update for My Repairs
        const myAssignedRepairs = normalized.filter(t => String(t.repName || t.assignedTo) === String(repName) && t.status !== 'Available');
        setMyRepairs(myAssignedRepairs.slice(0, 3));

        alert('Repair claimed; repairman and status updated. Tickets refreshed from server.');
        return;
      }

      alert('Repair claimed but failed to reload tickets from server.');
    } catch (err) {
      let serverDetail = '';
      if (err && err.response && err.response.data) {
        const d = err.response.data;
        serverDetail = d.Result || d.message || JSON.stringify(d);
      } else if (err && err.message) {
        serverDetail = err.message;
      }
      console.error('UpdateRepairTicketStatus failed:', serverDetail || err);
      alert(`Server update failed: ${serverDetail || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl shadow-lg p-6 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Repair Technician Dashboard</h1>
              <p className="text-teal-100 mt-2">Welcome back, {displayName || user.username || user.name || 'Technician'}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-teal-100">Today's Date</div>
              <div className="font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsData.map((stat) => (
            <div key={stat.name} className={`bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-${stat.gradient.split('-')[1]}-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`text-4xl bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <CircularProgress />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Available Repairs */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Available Repairs</h2>
                  <Link to="/repairman/available-repairs" className="text-white hover:text-blue-100 text-sm font-medium transition-colors">
                    View All →
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {availableRepairs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Available Repairs</h3>
                    <p className="text-gray-600">All repairs are currently assigned.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableRepairs.map(ticket => (
                      <div key={ticket.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{ticket.brand}</h4>
                            <p className="text-sm text-gray-600">{ticket.customerName}</p>
                          </div>
                          <button onClick={() => claimRepair(ticket.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                            Claim Repair
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{ticket.issue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* My Repairs */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">My Repairs</h2>
                  <Link to="/repairman/assigned-repairs" className="text-white hover:text-green-100 text-sm font-medium transition-colors">
                    View All →
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {myRepairs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔧</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assigned Repairs</h3>
                    <p className="text-gray-600">Claim repairs from available repairs list.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRepairs.map(ticket => (
                      <div key={ticket.id} className={`bg-gray-50 rounded-lg p-4 border-l-4 ${getStatusColor(ticket.status).split(' ')[2]}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{ticket.brand}</h4>
                            <p className="text-sm text-gray-600">{ticket.customerName}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Due: {ticket.estimatedCompletion || 'Not set'}</span>
                          {/* 'Update' link removed on dashboard cards */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );


//   return (
//   <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', p: 3 }}>
//     <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

//       {/* HEADER */}
//       <Box
//         sx={{
//           mb: 4,
//           p: 3,
//           borderRadius: 3,
//           color: '#fff',
//           background: 'linear-gradient(135deg, #0f766e, #0891b2)'
//         }}
//       >
//         <Grid container justifyContent="space-between" alignItems="center">
//           <Grid item>
//             <h2 style={{ margin: 0 }}>Repair Dashboard</h2>
//             <p style={{ margin: 0 }}>
//               Welcome, {displayName || user.username || 'Technician'}
//             </p>
//           </Grid>
//           <Grid item>
//             {new Date().toLocaleDateString()}
//           </Grid>
//         </Grid>
//       </Box>

//       {/* STATS */}
//       <Grid container spacing={3} sx={{ mb: 4 }}>
//         {statsData.map((stat) => (
//           <Grid item xs={12} md={4} key={stat.name}>
//             <Box
//               sx={{
//                 p: 3,
//                 bgcolor: '#fff',
//                 borderRadius: 3,
//                 boxShadow: 2
//               }}
//             >
//               <Grid container justifyContent="space-between">
//                 <Grid item>
//                   <Box sx={{ color: 'text.secondary', fontSize: 14 }}>
//                     {stat.name}
//                   </Box>
//                   <Box sx={{ fontSize: 28, fontWeight: 'bold' }}>
//                     {stat.value}
//                   </Box>
//                 </Grid>
//                 <Grid item sx={{ fontSize: 28 }}>
//                   {stat.icon}
//                 </Grid>
//               </Grid>
//             </Box>
//           </Grid>
//         ))}
//       </Grid>

//       {/* MAIN CONTENT */}
//       <Grid container spacing={3}>

//         {/* AVAILABLE REPAIRS */}
//         <Grid item xs={12} md={6}>
//           <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
//             <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
//               <Grid container justifyContent="space-between">
//                 <Grid item>
//                   <strong>Available Repairs</strong>
//                 </Grid>
//                 <Grid item>
//                   <Link to="/repairman/available-repairs">View All</Link>
//                 </Grid>
//               </Grid>
//             </Box>

//             <Box sx={{ p: 2 }}>
//               {availableRepairs.length === 0 ? (
//                 <Box textAlign="center" py={5} color="text.secondary">
//                   No available repairs
//                 </Box>
//               ) : (
//                 availableRepairs.map((ticket) => (
//                   <Box
//                     key={ticket.id}
//                     sx={{
//                       p: 2,
//                       mb: 2,
//                       border: '1px solid #eee',
//                       borderRadius: 2,
//                       '&:hover': { bgcolor: '#fafafa' }
//                     }}
//                   >
//                     <Grid container justifyContent="space-between">
//                       <Grid item>
//                         <Box fontWeight="bold">{ticket.brand}</Box>
//                         <Box fontSize={13} color="text.secondary">
//                           {ticket.customerName}
//                         </Box>
//                       </Grid>

//                       <Grid item>
//                         <Button
//                           variant="contained"
//                           size="small"
//                           onClick={() => claimRepair(ticket.id)}
//                         >
//                           Claim
//                         </Button>
//                       </Grid>
//                     </Grid>

//                     <Box mt={1} fontSize={13} color="text.secondary">
//                       {ticket.issue}
//                     </Box>
//                   </Box>
//                 ))
//               )}
//             </Box>
//           </Card>
//         </Grid>

//         {/* MY REPAIRS */}
//         <Grid item xs={12} md={6}>
//           <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
//             <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
//               <Grid container justifyContent="space-between">
//                 <Grid item>
//                   <strong>My Repairs</strong>
//                 </Grid>
//                 <Grid item>
//                   <Link to="/repairman/assigned-repairs">View All</Link>
//                 </Grid>
//               </Grid>
//             </Box>

//             <Box sx={{ p: 2 }}>
//               {myRepairs.length === 0 ? (
//                 <Box textAlign="center" py={5} color="text.secondary">
//                   No assigned repairs
//                 </Box>
//               ) : (
//                 myRepairs.map((ticket) => (
//                   <Box
//                     key={ticket.id}
//                     sx={{
//                       p: 2,
//                       mb: 2,
//                       border: '1px solid #eee',
//                       borderRadius: 2
//                     }}
//                   >
//                     <Grid container justifyContent="space-between" alignItems="center">
//                       <Grid item>
//                         <Box fontWeight="bold">{ticket.brand}</Box>
//                         <Box fontSize={13} color="text.secondary">
//                           {ticket.customerName}
//                         </Box>
//                       </Grid>

//                       <Grid item>
//                         <Chip
//                           label={
//                             ticket.status === 'C' ? 'Completed' :
//                             ticket.status === 'W' ? 'Waiting' :
//                             ticket.status === 'D' ? 'Diagnosing' :
//                             ticket.status === 'I' ? 'In Progress' :
//                             ticket.status
//                           }
//                           color={
//                             ticket.status === 'C' ? 'success' :
//                             ticket.status === 'W' ? 'warning' :
//                             ticket.status === 'D' ? 'secondary' :
//                             'primary'
//                           }
//                           size="small"
//                         />
//                       </Grid>
//                     </Grid>

//                     <Box mt={1} fontSize={13} color="text.secondary">
//                       {ticket.issue}
//                     </Box>

//                     <Box textAlign="right" mt={1}>
//                       <Link to="/repairman/performing-task">
//                         Update →
//                       </Link>
//                     </Box>
//                   </Box>
//                 ))
//               )}
//             </Box>
//           </Card>
//         </Grid>

//       </Grid>
//     </Box>
//   </Box>
// );
};

export default RepairmanDashboard;