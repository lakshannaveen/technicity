// import React, { useState, useEffect } from 'react';
// import api from '../services/api';
// import UserService from '../services/UserService';
// import RepairmanService from '../services/RepairmanService';

// const AvailableRepairs = () => {
//   const user = JSON.parse(localStorage.getItem('user') || '{}');
//   const [availableRepairs, setAvailableRepairs] = useState([]);
//   const [filterStatus, setFilterStatus] = useState('All');

//   const normalizeStatus = (s) => {
//     const st = (s == null) ? '' : String(s).trim();
//     const low = st.toLowerCase();
//     if (low === 'w') return 'Waiting for Parts';
//     if (low === 'i') return 'In Progress';
//     if (low === 'c') return 'Completed';
//     if (low === 'a' || low === 'approved') return 'Approved';
//     if (low === 'r' || low === 'rejected') return 'Rejected';
//     if (low === 'inprogress' || low === 'in progress') return 'In Progress';
//     if (low.includes('waiting') && low.includes('part')) return 'Waiting for Parts';
//     // If it's literally 'Available' or empty, treat as Available
//     if (low === 'available' || low === '') return 'Available';
//     return st || '';
//   };


//   // Load available repairs from backend (or fall back to localStorage)
//   useEffect(() => {
//     const loadAvailableRepairs = async () => {
//       try {
//         const res = await api.get('/RepairTicket/GetAllRepairTicket');

//         let list = [];
//         if (res && res.data) {
//           if (Array.isArray(res.data.ResultSet)) list = res.data.ResultSet;
//           else if (res.data.Result) {
//             try { list = JSON.parse(res.data.Result); } catch (e) { list = res.data.Result; }
//           } else if (Array.isArray(res.data)) list = res.data;
//           else if (Array.isArray(res.data.data)) list = res.data.data;
//         }

//         if (list && list.length > 0) {
//           const normalized = list.map(item => ({
//             id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || Date.now(),
//             brand: item.brand || item.device || item.device_brand || '',
//             issue: item.issue_description || item.issue || '',
//             customerName: item.customer_name || item.customer || '',
//             customerPhone: item.customer_phone || item.customerPhone || '',
//             status: normalizeStatus(item.status || item.Status) || 'Available',
//             assignedTo: item.assignedTo || item.assigned_to || item.repairman || item.assigned || item.rep_name || item.repName || '',
//             barcodeValue: item.barcode || item.barcodeValue || `TKT${String(item.ticket_id || item.id || Date.now()).padStart(6, '0')}`,
//             createdAt: item.created_date || item.createdAt || item.created_at || item.date || ''
//           }));

//           const availableRepairsData = normalized.filter(ticket => {
//             const s = String(ticket.status || '').toLowerCase();
//             const assigned = String(ticket.assignedTo || '').trim().toLowerCase();
//             // Available if status is literally Available OR status is Diagnosing/empty but no one is assigned
//             return s === 'available' || (s === 'diagnosing' && assigned === '') || (s === '' && assigned === '');
//           });

//           setAvailableRepairs(availableRepairsData);

//           localStorage.setItem('repairTickets', JSON.stringify(normalized));
//           return;
//         }
//       } catch (err) {
//         console.warn('Failed to fetch tickets from server, falling back to localStorage', err);
//       }


//       // fallback
//       try {
//         const storedTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
//         const availableRepairsData = storedTickets.filter(ticket => ticket.status === 'Available');
//         setAvailableRepairs(availableRepairsData);
//       } catch (error) {
//         console.error('Error loading tickets from localStorage:', error);
//         setAvailableRepairs([]);
//       }
//     };

//     loadAvailableRepairs();
//     const interval = setInterval(loadAvailableRepairs, 5000);
//     return () => clearInterval(interval);
//   }, []);

//   const statusOptions = ['All', 'Available'];

//   const filteredRepairs = filterStatus === 'All'
//     ? availableRepairs
//     : availableRepairs.filter(ticket => ticket.status === filterStatus);

//   const formatDate = (d) => {
//     if (!d) return '-';
//     try {
//       // normalize yyyy/mm/dd output
//       const dt = new Date(d);
//       if (isNaN(dt)) return d;
//       const yyyy = dt.getFullYear();
//       const mm = String(dt.getMonth() + 1).padStart(2, '0');
//       const dd = String(dt.getDate()).padStart(2, '0');
//       return `${yyyy}/${mm}/${dd}`;
//     } catch (e) {
//       return d;
//     }
//   };

//   const claimRepair = async (ticketId) => {
//     // First, ensure we have the logged-in username to send as rep_name
//     const storedTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
//     const ticket = storedTickets.find(t => t.id === ticketId);
//     if (!ticket) {
//       alert('Ticket not found');
//       return;
//     }

//     const rawUser = user || {};
//     // Try to resolve authoritative username from server (TestGetUserRole) when possible.
//     // This ensures we send the same account name that the dashboard/header shows.
//     let repName = '';
//     const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
//     if (mobile) {
//       try {
//         const roleRes = await UserService.testGetUserRole(mobile);
//         if (roleRes && roleRes.data) {
//           const maybe = (roleRes.data.ResultSet && roleRes.data.ResultSet[0]) || roleRes.data.Result || roleRes.data;
//           const maybeName = (maybe && (maybe.UserName || maybe.User || maybe.name || maybe.displayName || maybe.fullName)) || '';
//           if (maybeName) repName = String(maybeName).trim();
//         }
//       } catch (e) {
//         // ignore and fall back to local values
//       }
//     }

//     // If server lookup failed or not available, fall back to local stored display/username
//     if (!repName) {
//       repName = (rawUser.displayName || rawUser.UserName || rawUser.username || rawUser.name || rawUser.fullName || '').toString().trim();
//     }

//     // final fallback
//     if (!repName) repName = 'unknown';

//     // Persist resolved name to localStorage so UI/header and other pages stay in sync
//     try {
//       const stored = JSON.parse(localStorage.getItem('user') || '{}');
//       if (repName && stored) {
//         stored.UserName = stored.UserName || repName;
//         stored.displayName = stored.displayName || repName;
//         // also keep username field and a dedicated rep_name key for other pages
//         stored.username = stored.username || repName;
//         try { localStorage.setItem('rep_name', repName); } catch (e) { /* ignore */ }
//         localStorage.setItem('user', JSON.stringify(stored));
//       }
//     } catch (e) {
//       // ignore persistence failures
//     }

//     // 1) Resolve repairman_id and call UpdateRepairmanName with { ticket_id, repairman_id }
//     const MAX_INT32 = 2147483647;
//     const normalizeToInt = (v) => {
//       if (v === undefined || v === null) return null;
//       const digits = String(v).replace(/[^0-9\-]/g, '');
//       if (digits === '') return null;
//       const n = parseInt(digits, 10);
//       if (Number.isNaN(n)) return null;
//       if (Math.abs(n) > MAX_INT32) return null;
//       return n;
//     };

//     let repairmanId = null;
//     const mobileClean = mobile || '';

//     // Note: `TestGetUserRole` returns account/user information (user_id etc.)
//     // which is not guaranteed to match `repairman_id` in the Repairman table.
//     // Avoid treating generic `user_id` as `repairman_id` to prevent FK conflicts.
//     // We'll rely on the local `repairmen` cache or `RepairmanService.GetAllRepairman`
//     // to resolve the authoritative `repairman_id`.

//     // 2) Fallback to local `repairmen` cache
//     if (!repairmanId) {
//       try {
//         const cached = JSON.parse(localStorage.getItem('repairmen') || '[]');
//         if (Array.isArray(cached) && cached.length > 0) {
//           const found = cached.find(r => {
//             const names = [r.repairman_name, r.name, r.UserName, r.username, r.displayName].filter(Boolean).map(x => String(x).trim().toLowerCase());
//             return names.includes(String(repName).trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobileClean)) || (r.phone && String(r.phone).replace(/\D/g, '') === String(mobileClean));
//           });
//           if (found) {
//             const candidates = [found.RepairmanID, found.RepairmanId, found.repairman_id, found.id];
//             for (const c of candidates) {
//               const n = normalizeToInt(c);
//               if (n) { repairmanId = n; break; }
//             }
//           }
//         }
//       } catch (e) { /* ignore parse errors */ }
//     }

//     // 3) Fallback to server Repairman list
//     if (!repairmanId) {
//       try {
//         const srv = await RepairmanService.GetAllRepairman();
//         let list = [];
//         if (srv && srv.data) {
//           if (Array.isArray(srv.data.ResultSet) && srv.data.ResultSet.length > 0) list = srv.data.ResultSet;
//           else if (srv.data.Result) {
//             try { list = JSON.parse(srv.data.Result); } catch (e) { list = srv.data.Result; }
//           } else if (Array.isArray(srv.data)) list = srv.data;
//         }

//         const foundSrv = (list || []).find(r => {
//           const names = [r.repairman_name, r.name, r.UserName, r.username].filter(Boolean).map(x => String(x).trim().toLowerCase());
//           return names.includes(String(repName).trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobileClean)) || (r.phone && String(r.phone).replace(/\D/g, '') === String(mobileClean));
//         });

//         if (foundSrv) {
//           const candidates = [foundSrv.RepairmanID, foundSrv.RepairmanId, foundSrv.repairman_id, foundSrv.id];
//           for (const c of candidates) {
//             const n = normalizeToInt(c);
//             if (n) { repairmanId = n; break; }
//           }
//         }
//       } catch (e) {
//         console.warn('RepairmanService.GetAllRepairman failed', e);
//       }
//     }

//     if (!repairmanId) {
//       alert(`Could not resolve a valid numeric repairman_id for '${repName}'.\nPlease ensure TestGetUserRole or GetAllRepairman returns the repairman id for your account.`);
//       return;
//     }

//     // send `{ ticket_id, repairman_id }` to backend (form-encoded)
//     try {
//       const nameParams = new URLSearchParams();
//       nameParams.append('ticket_id', String(ticketId));
//       nameParams.append('repairman_id', String(repairmanId));

//       const nameRes = await api.post('/RepairTicket/UpdateRepairmanName', nameParams.toString(), {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
//       });

//       if (!(nameRes && (nameRes.status === 200 || (nameRes.data && (nameRes.data.StatusCode === 200 || nameRes.data.status === 'success'))))) {
//         const serverMsg = nameRes && nameRes.data ? (nameRes.data.Result || JSON.stringify(nameRes.data)) : 'Unexpected server response';
//         alert(`UpdateRepairmanName failed: ${serverMsg}`);
//         return;
//       }
//     } catch (err) {
//       let serverDetail = '';
//       if (err && err.response && err.response.data) {
//         const d = err.response.data;
//         serverDetail = d.Result || d.message || JSON.stringify(d);
//       } else if (err && err.message) {
//         serverDetail = err.message;
//       }
//       console.error('UpdateRepairmanName failed:', serverDetail || err);
//       alert(`Failed to assign repairman: ${serverDetail || 'Unknown error'}`);
//       return;
//     }

//     // 2) Update status to Diagnosing (so DB shows it's claimed)
//     const assignedDate = new Date().toISOString().split('T')[0];

//     const params = new URLSearchParams();
//     params.append('ticket_id', String(ticketId));
//     params.append('status', 'Diagnosing');
//     params.append('repairman_id', String(repairmanId));
//     if (repName) params.append('assignedTo', repName);
//     params.append('assignedDate', assignedDate);

//     try {
//       const res = await api.post('/RepairTicket/UpdateRepairTicketStatus', params.toString(), {
//         headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
//       });

//       if (!(res && (res.status === 200 || (res.data && res.data.StatusCode === 200)))) {
//         const serverMsg = res && res.data ? (res.data.Result || JSON.stringify(res.data)) : 'Unexpected server response';
//         alert(`Server update failed: ${serverMsg}`);
//         return;
//       }

//       // reload tickets from server to reflect authoritative DB state
//       const listRes = await api.get('/RepairTicket/GetAllRepairTicket');
//       if (listRes && listRes.data && (listRes.data.StatusCode === 200 || listRes.status === 200)) {
//         let list = [];
//         if (Array.isArray(listRes.data.ResultSet) && listRes.data.ResultSet.length > 0) list = listRes.data.ResultSet;
//         else if (listRes.data.Result) {
//           try { list = JSON.parse(listRes.data.Result); } catch (e) { list = listRes.data.Result; }
//         }

//         const normalized = (list || []).map(item => ({
//           id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || Date.now(),
//           brand: item.brand || item.device || item.device_brand || '',
//           issue: item.issue_description || item.issue || '',
//           customerName: item.customer_name || item.customer || '',
//           customerPhone: item.customer_phone || item.customerPhone || '',
//           status: item.status || item.Status || 'Available',
//           barcodeValue: item.barcode || item.barcodeValue || `TKT${String(item.ticket_id || item.id || Date.now()).padStart(6, '0')}`,
//           createdAt: item.createdAt || item.created_at || item.date || '',
//           repName: item.repairman_name || item.repairman || item.assignedTo || ''
//         }));

//         localStorage.setItem('repairTickets', JSON.stringify(normalized));
//         const availableRepairsData = normalized.filter(t => t.status === 'Available');
//         setAvailableRepairs(availableRepairsData);
//         alert('Repair claimed; repairman and status updated. Tickets refreshed from server.');
//         return;
//       }

//       alert('Repair claimed but failed to reload tickets from server.');
//     } catch (err) {
//       let serverDetail = '';
//       if (err && err.response && err.response.data) {
//         const d = err.response.data;
//         serverDetail = d.Result || d.message || JSON.stringify(d);
//       } else if (err && err.message) {
//         serverDetail = err.message;
//       }
//       console.error('UpdateRepairTicketStatus failed:', serverDetail || err);
//       alert(`Server update failed: ${serverDetail || 'Unknown error'}`);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex items-center justify-between mb-6">
//           <h1 className="text-2xl font-bold text-gray-900">Available Repairs</h1>
//           <div className="ml-4 p-3 bg-white rounded-lg shadow">
//             <div className="text-xs text-gray-500">Available Records</div>
//             <div className="text-xl font-bold text-gray-900">{availableRepairs.length}</div>
//           </div>
//         </div>


//         {/* Available Repairs Table */}
//         <div className="bg-white rounded-xl shadow-md p-6">
//           <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Repair Tickets</h2>

//           {availableRepairs.length === 0 ? (
//             <div className="text-center py-8">
//               <div className="text-5xl mb-4">📋</div>
//               <h3 className="text-lg font-semibold text-gray-800 mb-2">No Available Repairs</h3>
//               <p className="text-gray-600">All repairs are currently assigned to technicians.</p>
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {filteredRepairs.map(ticket => (
//                     <tr key={ticket.id}>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{ticket.brand}</div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{ticket.customerName}</div>
//                         <div className="text-sm text-gray-500">{ticket.customerPhone}</div>
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="text-sm text-gray-900">{ticket.issue}</div>
//                         {ticket.notes && (
//                           <div className="text-sm text-gray-500 mt-1">Notes: {ticket.notes}</div>
//                         )}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                         {formatDate(ticket.createdAt)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                         <button
//                           onClick={() => claimRepair(ticket.id)}
//                           className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
//                         >
//                           Claim Repair
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AvailableRepairs;


import React, { useState, useEffect } from 'react';
import api from '../services/api';
import UserService from '../services/UserService';
import RepairmanService from '../services/RepairmanService';

import {
  Box,
  Grid,
  Card,
  Typography,
  Button,
  Chip,
  CircularProgress
} from "@mui/material";

const AvailableRepairs = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  const [availableRepairs, setAvailableRepairs] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const normalizeStatus = (s) => {
    const st = (s == null) ? '' : String(s).trim();
    const low = st.toLowerCase();
    if (low === 'd' || low.startsWith('diag')) return 'Diagnosing';
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

  // 🔥 LOAD DATA
  useEffect(() => {
    const loadAvailableRepairs = async () => {
      try {
        setIsLoading(true);
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

        // ✅ NORMALIZE (WITH repairman_id + assignedTo)
        const normalized = (list || []).map(item => ({
          id: item.ticket_id || item.TicketID || item.id || Date.now(),
          brand: item.brand || item.device || item.device_brand || '',
          issue: item.issue_description || item.issue || '',
          customerName: item.customer_name || item.customer || '',
          customerPhone: item.phone_no || item.customerPhone || item.customer_phone || '',
          status: normalizeStatus(item.status || item.Status),
          repairman_id: item.repairman_id ?? item.RepairmanID ?? item.RepairmanId ?? null,
          assignedTo: item.assignedTo || item.assigned || item.rep_name || item.repairman || '',
          createdAt: item.created_date || item.createdAt || item.created_at || item.date || ''
        }));

        // persist normalized tickets for other pages that read localStorage
        try { localStorage.setItem('repairTickets', JSON.stringify(normalized)); } catch (e) { /* ignore */ }

        // Helper: treat '0', 0, 'null', empty as unassigned
        const isAssigned = (t) => {
          const rid = t.repairman_id;
          if (rid !== undefined && rid !== null) {
            const rs = String(rid).trim().toLowerCase();
            if (rs !== '' && rs !== '0' && rs !== 'null') return true;
          }
          const a = String(t.assignedTo || '').trim().toLowerCase();
          if (a !== '' && a !== '0' && a !== 'null') return true;
          return false;
        };

        // ✅ FILTER ONLY UNASSIGNED: require no repairman and no assigned name, and status available
        const availableRepairsData = normalized.filter(
          t => !isAssigned(t) && String(t.status || '').toLowerCase() === 'available'
        );

        setAvailableRepairs(availableRepairsData);

      } catch (err) {
        console.error('Failed to fetch available repairs:', err);
        setAvailableRepairs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableRepairs();
    // Poll only when the page is visible to avoid unexpected background reloads
    let interval = null;
    const maybeStart = () => {
      if (document.visibilityState === 'visible') {
        // run an immediate refresh then start interval
        loadAvailableRepairs();
        interval = setInterval(loadAvailableRepairs, 30000);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // refresh once when user returns to the tab
        loadAvailableRepairs();
        if (!interval) interval = setInterval(loadAvailableRepairs, 30000);
      } else {
        if (interval) { clearInterval(interval); interval = null; }
      }
    };

    maybeStart();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
    } catch {
      return d;
    }
  };

  // Server-backed claim handler: resolve repairman and call API to claim ticket
  const claimRepair = async (ticketId) => {
    // Resolve rep name from session or server
    const rawUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    let repName = '';
    try {
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
          // ignore and fall back
        }
      }
    } catch (e) { /* ignore */ }

    if (!repName) repName = (rawUser.displayName || rawUser.UserName || rawUser.username || rawUser.name || rawUser.fullName || '').toString().trim();
    if (!repName) repName = 'unknown';

    // Persist rep_name for other pages
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
      if (repName && stored) {
        stored.UserName = stored.UserName || repName;
        stored.displayName = stored.displayName || repName;
        stored.username = stored.username || repName;
        try { sessionStorage.setItem('rep_name', repName); } catch (e) { /* ignore */ }
        try { localStorage.setItem('rep_name', repName); } catch (e) { /* ignore */ }
        sessionStorage.setItem('user', JSON.stringify(stored));
      }
    } catch (e) { /* ignore */ }

    // Helper to parse integer IDs safely
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

    // Resolve repairman_id: local cache then server
    let repairmanId = null;
    const mobileClean = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || '').toString().replace(/\D/g, '');
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
    } catch (e) { /* ignore */ }

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
      alert(`Could not resolve a valid repairman_id for '${repName}'. Please ensure your account is listed as a repairman.`);
      return;
    }

    // Call UpdateRepairmanName
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

    // Update status to Diagnosing
    try {
      const assignedDate = new Date().toISOString().split('T')[0];
      const params = new URLSearchParams();
      params.append('ticket_id', String(ticketId));
      params.append('status', 'Diagnosing');
      params.append('repairman_id', String(repairmanId));
      if (repName) params.append('assignedTo', repName);
      params.append('assignedDate', assignedDate);

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
          id: item.ticket_id || item.TicketID || item.id,
          brand: item.brand || item.device || item.device_brand || '',
          issue: item.issue_description || item.issue || '',
          customerName: item.customer_name || item.customer || '',
          customerPhone: item.customer_phone || item.customerPhone || '',
          status: normalizeStatus(item.status || item.Status) || 'Available',
          repairman_id: item.repairman_id || item.RepairmanID || item.RepairmanId || null,
          createdAt: item.created_date || item.createdAt || item.created_at || item.date || ''
        }));

        localStorage.setItem('repairTickets', JSON.stringify(normalized));
        const availableRepairsData = normalized.filter(t => !t.repairman_id || (t.status || '').toLowerCase() === 'available');
        setAvailableRepairs(availableRepairsData);

        alert('Ticket updated successfully.');
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

  const filteredRepairs = filterStatus === 'All'
    ? availableRepairs
    : availableRepairs.filter(t => t.status === filterStatus);

  // return (
  //   <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', p: 3 }}>
  //     <Box sx={{ maxWidth: 1300, mx: 'auto' }}>

  //       {/* HEADER */}
  //       <Grid container justifyContent="space-between" alignItems="center" mb={3}>
  //         <Typography variant="h5" fontWeight="bold">
  //           Available Repairs
  //         </Typography>

  //         <Card sx={{ px: 3, py: 1.5, borderRadius: 3 }}>
  //           <Typography fontSize={12} color="text.secondary">
  //             Available Records
  //           </Typography>
  //           <Typography fontWeight="bold">
  //             {availableRepairs.length}
  //           </Typography>
  //         </Card>
  //       </Grid>

  //       {/* LIST */}
  //       <Card sx={{ p: 3, borderRadius: 4 }}>
  //         <Typography variant="h6" fontWeight="bold" mb={2}>
  //           Available Repair Tickets
  //         </Typography>

  //         {filteredRepairs.length === 0 ? (
  //           <Box textAlign="center" py={6}>
  //             <Typography fontSize={50}>📋</Typography>
  //             <Typography fontWeight="bold">
  //               No Available Repairs
  //             </Typography>
  //             <Typography color="text.secondary">
  //               All repairs are currently assigned.
  //             </Typography>
  //           </Box>
  //         ) : (
  //           <Grid container spacing={2}>
  //             {filteredRepairs.map((ticket) => (
  //               <Grid item xs={12} md={6} lg={4} key={ticket.id}>
  //                 <Card
  //                   sx={{
  //                     p: 2,
  //                     borderRadius: 3,
  //                     boxShadow: 2,
  //                     transition: '0.3s',
  //                     '&:hover': {
  //                       transform: 'translateY(-5px)',
  //                       boxShadow: 5
  //                     }
  //                   }}
  //                 >
  //                   <Grid container justifyContent="space-between">
  //                     <Grid item>
  //                       <Typography fontWeight="bold">
  //                         {ticket.brand}
  //                       </Typography>
  //                       <Typography fontSize={13} color="text.secondary">
  //                         {ticket.customerName}
  //                       </Typography>
  //                       <Typography fontSize={12} color="text.secondary">
  //                         {ticket.customerPhone}
  //                       </Typography>
  //                     </Grid>

  //                     <Chip label="Available" color="primary" size="small" />
  //                   </Grid>

  //                   <Typography mt={1} fontSize={13} color="text.secondary">
  //                     {ticket.issue}
  //                   </Typography>

  //                   <Typography mt={1} fontSize={12} color="text.secondary">
  //                     Created: {formatDate(ticket.createdAt)}
  //                   </Typography>

  //                   <Box mt={2} textAlign="right">
  //                     <Button
  //                       variant="contained"
  //                       size="small"
  //                       onClick={() => claimRepair(ticket.id)}
  //                     >
  //                       Claim Repair
  //                     </Button>
  //                   </Box>
  //                 </Card>
  //               </Grid>
  //             ))}
  //           </Grid>
  //         )}
  //       </Card>
  //     </Box>
  //   </Box>
  // );

  return (
  <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', py: 4, px: 2 }}>
    <Box sx={{ maxWidth: 1300, mx: 'auto' }}>

      {/* HEADER */}
      <Grid container justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5" fontWeight="bold">
          Available Repairs
        </Typography>

        <Card sx={{ px: 4, py: 2, borderRadius: 3, boxShadow: 2 }}>
          <Typography fontSize={12} color="text.secondary">
            Available Records
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {availableRepairs.length}
          </Typography>
        </Card>
      </Grid>

      {/* MAIN CARD */}
      <Card sx={{ p: 4, borderRadius: 4, boxShadow: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={3}>
          Available Repair Tickets
        </Typography>

        {isLoading ? (
          <Box textAlign="center" py={6}>
            <CircularProgress />
          </Box>
        ) : filteredRepairs.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography fontSize={60} mb={2}>📋</Typography>
            <Typography fontWeight="bold" mb={1}>
              No Available Repairs
            </Typography>
            <Typography color="text.secondary">
              All repairs are currently assigned.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredRepairs.map((ticket) => (
              <Grid item xs={12} md={6} lg={4} key={ticket.id}>
                <Card
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    boxShadow: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: '0.3s',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: 6
                    }
                  }}
                >
                  {/* TOP */}
                  <Box>
                    <Grid container justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography fontWeight="bold" mb={0.5}>
                          {ticket.brand}
                        </Typography>

                        <Typography fontSize={13} color="text.secondary">
                          {ticket.customerName}
                        </Typography>

                        <Typography fontSize={12} color="text.secondary" mb={1}>
                          {ticket.customerPhone}
                        </Typography>
                      </Box>

                      <Chip
                        label="Available"
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Grid>

                    {/* ISSUE */}
                    <Typography mt={2} fontSize={13} color="text.secondary" lineHeight={1.5}>
                      {ticket.issue}
                    </Typography>

                    {/* DATE */}
                    <Typography mt={2} fontSize={12} color="text.secondary">
                      Created: {formatDate(ticket.createdAt)}
                    </Typography>
                  </Box>

                  {/* ACTION */}
                  <Box mt={3} textAlign="right">
                    <Button
                      variant="contained"
                      size="medium"
                      onClick={() => claimRepair(ticket.id)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        px: 3
                      }}
                    >
                      Claim Repair
                    </Button>
                  </Box>

                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Card>
    </Box>
  </Box>
);
};

export default AvailableRepairs;