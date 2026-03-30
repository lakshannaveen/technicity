// import React, { useEffect, useState } from 'react';
// import api from '../services/api';
// import UserService from '../services/UserService';
// import RepairmanService from '../services/RepairmanService';



// const AgeetWorkPerformingTask = () => {
// 	const user = JSON.parse(localStorage.getItem('user') || '{}');
// 	const [tickets, setTickets] = useState([]);
// 	const [repairmanId, setRepairmanId] = useState(null);
// 	// prefer server-resolved canonical rep_name, fall back to stored user.username

// 	const repNameUsed = (localStorage.getItem('rep_name') || user.username || '').trim();

// 	const normalizeStatus = (s) => {
// 		const st = (s == null) ? '' : String(s).trim();
// 		const low = st.toLowerCase();
// 		if (low === 'w') return 'Waiting for Parts';
// 		if (low === 'i') return 'In Progress';
// 		if (low === 'c') return 'Completed';
// 		if (low === 'a' || low === 'approved') return 'Approved';
// 		if (low === 'r' || low === 'rejected') return 'Rejected';
// 		if (low === 'inprogress' || low === 'in progress') return 'In Progress';
// 		if (low.includes('waiting') && low.includes('part')) return 'Waiting for Parts';
// 		if (low === 'available' || low === '') return 'Available';
// 		return st || '';
// 	};

// 	const normalize = (item) => ({
// 		id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || item.barcode || item.barcodeValue || '',
// 		brand: item.brand || item.device || item.device_brand || item.brand_name || '',
// 		issue: item.issue_description || item.issue || item.problem || '',
// 		status: normalizeStatus(item.status || item.Status) || 'In Progress',
// 		// backend may return assigned field under several names, including rep_name
// 		assignedTo: item.assignedTo || item.assigned_to || item.repairman || item.assigned || item.rep_name || item.repName || '',
// 		// backend may return repairman id under several keys
// 		repairmanId: item.repairman_id || item.RepairmanID || item.RepairmanId || item.repairmanId || '',
// 		raw: item
// 	});


// 	useEffect(() => {
// 		let mounted = true;

// 		const load = async () => {
// 			// First try server endpoint for In Progress tickets
// 			let repairmanId = null;
// 			try {
// 				// resolve repairman_id (prefer TestGetUserRole)
// 				const rawUser = user || {};
// 				const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
// 				const MAX_INT32 = 2147483647;
// 				const normalizeToInt = (v) => {
// 					if (v === undefined || v === null) return null;
// 					const digits = String(v).replace(/[^0-9-]/g, ''); // Fixed: removed unnecessary escape
// 					if (digits === '') return null;
// 					const n = parseInt(digits, 10);
// 					if (Number.isNaN(n)) return null;
// 					if (Math.abs(n) > MAX_INT32) return null;
// 					return n;
// 				};

// 				if (mobile) {
// 					try {
// 						const roleRes = await UserService.testGetUserRole(mobile);
// 						if (roleRes && roleRes.data) {
// 							const maybe = (roleRes.data.ResultSet && roleRes.data.ResultSet[0]) || roleRes.data.Result || roleRes.data;
// 							const candidates = [
// 								maybe && maybe.RepairmanID,
// 								maybe && maybe.RepairmanId,
// 								maybe && maybe.repairman_id,
// 								maybe && maybe.repairmanId,
// 								maybe && maybe.user_id,
// 								maybe && maybe.UserID,
// 								maybe && maybe.userId,
// 								maybe && maybe.id
// 							];
// 							for (const c of candidates) {
// 								const n = normalizeToInt(c);
// 								if (n) { repairmanId = n; break; }
// 							}
// 						}
// 					} catch (e) { /* ignore */ }
// 				}

// 				// fallback to local cache and server list if needed
// 				if (!repairmanId) {
// 					try {
// 						const cached = JSON.parse(localStorage.getItem('repairmen') || '[]');
// 						const found = (cached || []).find(r => (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobile)) || (r.phone && String(r.phone).replace(/\D/g, '') === String(mobile)) || String(r.username || r.repairman_name || r.name || '').trim().toLowerCase() === repNameUsed.toLowerCase());
// 						if (found) {
// 							const candidates = [found.RepairmanID, found.RepairmanId, found.repairman_id, found.id];
// 							for (const c of candidates) { const n = normalizeToInt(c); if (n) { repairmanId = n; break; } }
// 						}
// 					} catch (e) { /* ignore */ }
// 				}

// 				if (!repairmanId) {
// 					try {
// 						const srv = await RepairmanService.GetAllRepairman();
// 						let list = [];
// 						if (srv && srv.data) {
// 							if (Array.isArray(srv.data.ResultSet) && srv.data.ResultSet.length > 0) list = srv.data.ResultSet;
// 							else if (srv.data.Result) {
// 								try { list = JSON.parse(srv.data.Result); } catch (e) { list = srv.data.Result; }
// 							} else if (Array.isArray(srv.data)) list = srv.data;
// 						}
// 						const foundSrv = (list || []).find(r => String(r.repairman_contact || r.phone || r.username || r.repairman_name || r.name || '').trim().toLowerCase() === repNameUsed.toLowerCase() || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobile)));
// 						if (foundSrv) {
// 							const candidates = [foundSrv.RepairmanID, foundSrv.RepairmanId, foundSrv.repairman_id, foundSrv.id];
// 							for (const c of candidates) { const n = normalizeToInt(c); if (n) { repairmanId = n; break; } }
// 						}
// 					} catch (e) { /* ignore */ }
// 				}

// 				if (!repairmanId) {
// 					console.warn('Could not resolve repairman_id; falling back to rep_name query');
// 				}

// 				const fetchInProgress = async () => {
// 					let list = [];
// 					const username = String(user.username || '').trim();
// 					const repName = String(localStorage.getItem('rep_name') || '').trim();

// 					const targets = [];
// 					if (repairmanId) targets.push(`repairman_id=${repairmanId}`);
// 					if (username) targets.push(`rep_name=${encodeURIComponent(username)}`);
// 					if (repName && repName !== username) targets.push(`rep_name=${encodeURIComponent(repName)}`);
// 					targets.push(''); // full fetch fallback

// 					for (const t of targets) {
// 						const url = `/RepairTicket/GetInProgressRepairTickets${t ? '?' + t : ''}`;
// 						try {
// 							const res = await api.get(url);
// 							let candidate = [];
// 							if (res && res.data) {
// 								if (Array.isArray(res.data.ResultSet)) candidate = res.data.ResultSet;
// 								else if (res.data.Result) {
// 									try { candidate = JSON.parse(res.data.Result); } catch (e) { candidate = res.data.Result; }
// 								} else if (Array.isArray(res.data)) candidate = res.data;
// 							}
// 							if (Array.isArray(candidate) && candidate.length > 0) {
// 								list = candidate;
// 								break;
// 							}
// 						} catch (e) { /* ignore */ }

// 					}
// 					return list;
// 				};

// 				const list = await fetchInProgress();


// 				if (list && list.length > 0) {
// 					const normalized = list.map(normalize);
// 					// API returns ResultSet — filter to only In Progress tickets assigned to this repairman
// 					const inProgress = normalized.filter(t => {
// 						const s = (t.status || (t.raw && (t.raw.status || t.raw.Status))) || '';

// 						const ticketRepId = String(t.repairmanId || (t.raw && (t.raw.repairman_id || t.raw.RepairmanID || t.raw.RepairmanId)) || '').trim();
// 						const assigned = String(t.assignedTo || t.repName || t.rep_name || (t.raw && (t.raw.assignedTo || t.raw.assigned_to || t.raw.repairman || t.raw.rep_name || t.raw.repName)) || '').trim().toLowerCase();
// 						const target = String(user.username || '').trim().toLowerCase();
// 						const targetRepName = String(localStorage.getItem('rep_name') || '').trim().toLowerCase();

// 						const idMatch = repairmanId && String(ticketRepId) === String(repairmanId);
// 						const nameMatch = (assigned === target) || (targetRepName && assigned === targetRepName) || (assigned !== '' && target.includes(assigned)) || (target !== '' && assigned.includes(target));

// 						return String(s) === 'In Progress' && (idMatch || nameMatch);
// 					});





// 					if (mounted) {
// 						setRepairmanId(repairmanId);
// 						setTickets(inProgress);
// 					}

// 					return;
// 				}

// 				// If the server explicitly returned an empty list, just update the state.
// 				// DO NOT clear localStorage here, as it may contain valid tickets filtered by name.
// 				if (Array.isArray(list) && list.length === 0) {
// 					if (mounted) setTickets([]);
// 					return;
// 				}

// 			} catch (err) {
// 				console.warn('GetInProgressRepairTickets failed, falling back to localStorage', err && err.message ? err.message : err);
// 			}

// 			// fallback to localStorage
// 			try {
// 				const stored = JSON.parse(localStorage.getItem('diagnosingTickets') || localStorage.getItem('repairTickets') || '[]');
// 				if (Array.isArray(stored) && stored.length > 0) {
// 					const normalized = stored.map(normalize);
// 					// fallback: show stored In Progress tickets only for this repairman
// 					const inProgressStored = normalized.filter(t => {
// 						const s = (t.status || (t.raw && (t.raw.status || t.raw.Status))) || '';
// 						if (repairmanId) {
// 							const ticketRepId = (t.repairmanId || (t.raw && (t.raw.repairman_id || t.raw.RepairmanID || t.raw.RepairmanId))) || '';
// 							return String(s) === 'In Progress' && String(ticketRepId) === String(repairmanId);
// 						}
// 						const assigned = String(t.assignedTo || t.repName || (t.raw && (t.raw.assignedTo || t.raw.assigned_to || t.raw.repairman)) || '').trim().toLowerCase();
// 						const target = String(user.username || '').trim().toLowerCase();
// 						const targetRepName = String(localStorage.getItem('rep_name') || '').trim().toLowerCase();
// 						return String(s) === 'In Progress' && (assigned === target || (targetRepName && assigned === targetRepName) || (assigned !== '' && target.includes(assigned)) || (target !== '' && assigned.includes(target)));
// 					});


// 					if (mounted) {
// 						setRepairmanId(repairmanId);
// 						setTickets(inProgressStored);
// 					}

// 					return;
// 				}
// 			} catch (e) {
// 				// ignore
// 			}

			
// 		};

// 		load();
// 		return () => { mounted = false; };
// 	}, [repNameUsed, user]); // Fixed: added 'user' to dependency array

// 	const persistUpdateLocal = (ticketId, newStatus) => {
// 		try {
// 			const repairTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
// 			const diagnosing = JSON.parse(localStorage.getItem('diagnosingTickets') || '[]');

// 			const updater = (arr) => (arr || []).map(t => {
// 				const rawId = t && (t.ticket_id || t.TicketID || t.id || t.DeviceID);
// 				const normId = t && (t.id || t.barcode || t.barcodeValue);
// 				if (String(rawId) === String(ticketId) || String(normId) === String(ticketId)) {
// 					// update both normalized status and raw.status for consistency
// 					const updatedRaw = t && t.raw && typeof t.raw === 'object' ? { ...t.raw, status: newStatus } : { ...(t.raw || {}), status: newStatus };
// 					return { ...t, status: newStatus, raw: updatedRaw };
// 				}
// 				return t;
// 			});

// 			localStorage.setItem('repairTickets', JSON.stringify(updater(repairTickets)));
// 			localStorage.setItem('diagnosingTickets', JSON.stringify(updater(diagnosing)));
// 		} catch (e) {
// 			// ignore
// 		}
// 	};

// 	const updateStatus = async (ticket, newStatus) => {
// 		// optimistic UI update — also update raw.status so rendered badge uses new value
// 		setTickets(prev => prev.map(t => {
// 			const matchId = String((t.raw && (t.raw.ticket_id || t.raw.TicketID)) || t.id);
// 			const tid = String((ticket.raw && (ticket.raw.ticket_id || ticket.raw.TicketID)) || ticket.id);
// 			if (matchId === tid) {
// 				return {
// 					...t,
// 					status: newStatus,
// 					raw: t.raw && typeof t.raw === 'object' ? { ...t.raw, status: newStatus } : { ...(t.raw || {}), status: newStatus }
// 				};
// 			}
// 			return t;
// 		}));

// 		// Prepare params similar to AssignedRepairs.updateRepairStatus
// 		let ticketId = (ticket && ticket.raw && (ticket.raw.ticket_id || ticket.raw.TicketID)) || ticket.id;
// 		const repId = ticket.repairmanId || ticket.repairman_id || (ticket.raw && (ticket.raw.repairman_id || ticket.raw.RepairmanID || ticket.raw.RepairmanId)) || repairmanId;
// 		const repName = ticket.assignedTo || (ticket.raw && (ticket.raw.assignedTo || ticket.raw.assigned_to || ticket.raw.repairman || ticket.raw.rep_name)) || repNameUsed;

// 		const params = new URLSearchParams();

// 		params.append('ticket_id', ticketId);
// 		params.append('TicketID', ticketId);
// 		params.append('status', newStatus);
// 		params.append('Status', newStatus);
// 		if (repId) {
// 			params.append('repairman_id', repId);
// 			params.append('RepairmanID', repId);
// 		}
// 		if (repName) {
// 			params.append('assignedTo', repName);
// 			params.append('rep_name', repName);
// 		}


// 		// include raw fields to avoid overwriting with nulls
// 		if (ticket && ticket.raw && typeof ticket.raw === 'object') {
// 			Object.keys(ticket.raw).forEach(key => {
// 				const val = ticket.raw[key];
// 				if (val === null || typeof val === 'undefined') return;
// 				if (typeof val === 'object') {
// 					try { params.append(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
// 				} else {
// 					params.append(key, String(val));
// 				}
// 			});
// 		}

// 		try {
// 			const res = await api.post('https://teknicitybackend.dockyardsoftware.com/RepairTicket/UpdateRepairTicketStatus', params.toString(), {
// 				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
// 			});

// 			const ok = res && (res.status === 200 || (res.data && (res.data.StatusCode === 200 || res.data.success === true)));
// 			if (ok) {
// 				// persist to localStorage and confirm
// 				persistUpdateLocal(ticketId, newStatus);
// 				// ensure UI raw/status are synchronized with persisted state
// 				setTickets(prev => prev.map(t => {
// 					const matchId = String((t.raw && (t.raw.ticket_id || t.raw.TicketID)) || t.id);
// 					if (matchId === String(ticketId)) {
// 						return { ...t, status: newStatus, raw: t.raw && typeof t.raw === 'object' ? { ...t.raw, status: newStatus } : { ...(t.raw || {}), status: newStatus } };
// 					}
// 					return t;
// 				}));
// 				alert(`Status for ${ticketId} updated to ${newStatus}`);
// 				return;
// 			}

// 			throw new Error('Server response not OK');
// 		} catch (err) {
// 			console.warn('UpdateRepairTicketStatus failed, falling back to local update', err && err.message ? err.message : err);
// 			// fallback local update
// 			persistUpdateLocal(ticketId, newStatus);
// 			alert(`Status for ${ticketId} updated locally to ${newStatus}`);
// 		}
// 	};

// 	return (
// 		<div className="p-6">
// 			<h2 className="text-2xl font-semibold mb-4">My Performing task</h2>

// 			<div className="bg-white shadow rounded p-4">
// 				<div className="overflow-x-auto">
// 					<table className="min-w-full divide-y divide-gray-200">
// 						<thead className="bg-gray-50">
// 							<tr>
// 								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
// 								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
// 								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
// 								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
// 								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
// 							</tr>
// 						</thead>
// 						<tbody className="bg-white divide-y divide-gray-200">
// 							{tickets.length === 0 ? (
// 								<tr>
// 									<td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No performing tasks</td>
// 								</tr>
// 							) : (
// 								tickets.map((t) => (
// 									<tr key={t.id}>
// 										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{(t.raw && (t.raw.ticket_id || t.raw.TicketID)) || t.id || '-'}</td>
// 										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(t.raw && (t.raw.brand || t.raw.device || t.raw.brand_name)) || t.brand || '-'}</td>
// 										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(t.raw && (t.raw.issue_description || t.raw.issue || t.raw.problem)) || t.issue || '-'}</td>
// 										<td className="px-6 py-4 whitespace-nowrap">
// 											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${((t.raw && (t.raw.status || t.raw.Status)) || t.status) === 'Completed' ? 'bg-green-100 text-green-800' : ((t.raw && (t.raw.status || t.raw.Status)) || t.status) === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
// 												}`}>{(t.raw && (t.raw.status || t.raw.Status)) || t.status}</span>
// 										</td>
// 										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
// 											{t.status !== 'In Progress' && (
// 												<button onClick={() => updateStatus(t, 'In Progress')} className="text-blue-600 hover:text-blue-900">Mark In Complete</button>
// 											)}
// 											{t.status !== 'Completed' && (
// 												<button onClick={() => updateStatus(t, 'Completed')} className="text-green-600 hover:text-green-900">Mark Completed</button>
// 											)}
// 										</td>
// 									</tr>
// 								))
// 							)}
// 						</tbody>
// 					</table>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

// export default AgeetWorkPerformingTask;


import React, { useEffect, useState } from 'react';
import api from '../services/api';
import UserService from '../services/UserService';
import RepairmanService from '../services/RepairmanService';

const AgeetWorkPerformingTask = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [tickets, setTickets] = useState([]);
  const [repairmanId, setRepairmanId] = useState(null);
  const repNameUsed = (sessionStorage.getItem('rep_name') || user.username || '').trim();

  const normalizeStatus = (s) => {
    const st = s == null ? '' : String(s).trim().toLowerCase();
    if (st === 'w') return 'Waiting for Parts';
    if (st === 'i' || st === 'inprogress' || st === 'in progress') return 'In Progress';
    if (st === 'c') return 'Completed';
    if (st === 'a' || st === 'approved') return 'Approved';
    if (st === 'r' || st === 'rejected') return 'Rejected';
    if (st.includes('waiting') && st.includes('part')) return 'Waiting for Parts';
    if (st === 'available' || st === '') return 'Available';
    return s || '';
  };

  const normalize = (item) => ({
    id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || item.barcode || item.barcodeValue || '',
    brand: item.brand || item.device || item.device_brand || item.brand_name || '',
    issue: item.issue_description || item.issue || item.problem || '',
    status: normalizeStatus(item.status || item.Status) || 'In Progress',
    assignedTo: item.assignedTo || item.assigned_to || item.repairman || item.assigned || item.rep_name || item.repName || '',
    repairmanId: item.repairman_id || item.RepairmanID || item.RepairmanId || item.repairmanId || '',
    raw: item,
  });

  useEffect(() => {
    let mounted = true;

    const resolveRepairmanId = async () => {
      const mobile = (user.phone || user.mobile || user.MobileNo || user.Mobile || user.mobileNo || '').toString().replace(/\D/g, '');
      const MAX_INT32 = 2147483647;

      const normalizeToInt = (v) => {
        if (!v) return null;
        const digits = String(v).replace(/\D/g, '');
        if (!digits) return null;
        const n = parseInt(digits, 10);
        if (Number.isNaN(n) || Math.abs(n) > MAX_INT32) return null;
        return n;
      };

      let repId = null;

      // Try server
      if (mobile) {
        try {
          const roleRes = await UserService.testGetUserRole(mobile);
          const maybe = (roleRes?.data?.ResultSet?.[0]) || roleRes?.data?.Result || roleRes?.data;
          const candidates = [maybe?.RepairmanID, maybe?.RepairmanId, maybe?.repairman_id, maybe?.repairmanId, maybe?.user_id, maybe?.UserID, maybe?.userId, maybe?.id];
          for (const c of candidates) {
            const n = normalizeToInt(c);
            if (n) { repId = n; break; }
          }
        } catch (e) { }
      }

      // fallback localStorage
      if (!repId) {
        try {
          const cached = JSON.parse(localStorage.getItem('repairmen') || '[]');
          const found = cached.find(r => 
            (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === mobile) ||
            (r.phone && String(r.phone).replace(/\D/g, '') === mobile) ||
            String(r.username || r.repairman_name || r.name || '').trim().toLowerCase() === repNameUsed.toLowerCase()
          );
          if (found) {
            const candidates = [found.RepairmanID, found.RepairmanId, found.repairman_id, found.id];
            for (const c of candidates) { const n = normalizeToInt(c); if (n) { repId = n; break; } }
          }
        } catch (e) { }
      }

      // fallback server GetAllRepairman
      if (!repId) {
        try {
          const srv = await RepairmanService.GetAllRepairman();
          let list = [];
          if (srv?.data?.ResultSet?.length) list = srv.data.ResultSet;
          else if (srv?.data?.Result) {
            try { list = JSON.parse(srv.data.Result); } catch { list = srv.data.Result; }
          } else if (Array.isArray(srv?.data)) list = srv.data;

          const foundSrv = list.find(r =>
            String(r.repairman_contact || r.phone || r.username || r.repairman_name || r.name || '').trim().toLowerCase() === repNameUsed.toLowerCase() ||
            (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === mobile)
          );

          if (foundSrv) {
            const candidates = [foundSrv.RepairmanID, foundSrv.RepairmanId, foundSrv.repairman_id, foundSrv.id];
            for (const c of candidates) { const n = normalizeToInt(c); if (n) { repId = n; break; } }
          }
        } catch (e) { }
      }

      return repId;
    };

    const fetchTickets = async () => {
      const repId = await resolveRepairmanId();
      if (!mounted) return;

      setRepairmanId(repId);

      try {
        const res = await api.get(`/RepairTicket/GetInProgressRepairTickets${repId ? '?repairman_id=' + repId : ''}`);
        let list = [];
        if (res?.data?.ResultSet) list = res.data.ResultSet;
        else if (res?.data?.Result) {
          try { list = JSON.parse(res.data.Result); } catch { list = res.data.Result; }
        } else if (Array.isArray(res?.data)) list = res.data;

        if (mounted) {
          const normalized = list.map(normalize);
          const inProgress = normalized.filter(t => t.status === 'In Progress' && (repId ? String(t.repairmanId) === String(repId) : true));
          setTickets(inProgress);
        }
      } catch (e) {
        console.warn('Failed to fetch tickets', e);
        // fallback localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('diagnosingTickets') || localStorage.getItem('repairTickets') || '[]');
          const normalized = stored.map(normalize);
          const inProgressStored = normalized.filter(t => t.status === 'In Progress' && (repId ? String(t.repairmanId) === String(repId) : true));
          if (mounted) setTickets(inProgressStored);
        } catch { }
      }
    };

    fetchTickets();

    return () => { mounted = false; };
  }, []); // empty dependency array => run once on mount

  const persistUpdateLocal = (ticketId, newStatus) => {
    try {
      const repairTickets = JSON.parse(localStorage.getItem('repairTickets') || '[]');
      const diagnosing = JSON.parse(localStorage.getItem('diagnosingTickets') || '[]');

      const updater = (arr) => (arr || []).map(t => {
        const rawId = t?.ticket_id || t?.TicketID || t?.id || t?.DeviceID;
        const normId = t?.id || t?.barcode || t?.barcodeValue;
        if (String(rawId) === String(ticketId) || String(normId) === String(ticketId)) {
          const updatedRaw = t?.raw ? { ...t.raw, status: newStatus } : { ...(t.raw || {}), status: newStatus };
          return { ...t, status: newStatus, raw: updatedRaw };
        }
        return t;
      });
      
      localStorage.setItem('repairTickets', JSON.stringify(updater(repairTickets)));
      localStorage.setItem('diagnosingTickets', JSON.stringify(updater(diagnosing)));
    } catch { }
  };

  const updateStatus = async (ticket, newStatus) => {
    setTickets(prev => prev.map(t => {
      if (String((t.raw?.ticket_id || t.raw?.TicketID) || t.id) === String((ticket.raw?.ticket_id || ticket.raw?.TicketID) || ticket.id)) {
        return { ...t, status: newStatus, raw: t.raw ? { ...t.raw, status: newStatus } : { ...(t.raw || {}), status: newStatus } };
      }
      return t;
    }));

    let ticketId = ticket.raw?.ticket_id ;
    const repId = ticket.repairmanId ;
    const repName = ticket.assignedTo ;

    const params = new URLSearchParams();
    params.append('ticket_id', ticketId);
    params.append('TicketID', ticketId);
    params.append('status', newStatus);
    params.append('Status', newStatus);
    if (repId) { params.append('repairman_id', repId); params.append('RepairmanID', repId); }
    if (repName) { params.append('assignedTo', repName); params.append('rep_name', repName); }

    Object.keys(ticket.raw || {}).forEach(key => {
      const val = ticket.raw[key];
      if (val === null || val === undefined) return;
      if (typeof val === 'object') {
        try { params.append(key, JSON.stringify(val)); } catch { }
      } else { params.append(key, String(val)); }
    });

    try {
      const res = await api.post('https://teknicitybackend.dockyardsoftware.com/RepairTicket/UpdateRepairTicketStatus', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const ok = res?.status === 200 || res?.data?.StatusCode === 200 || res?.data?.success === true;
	  
      if (ok) persistUpdateLocal(ticketId, newStatus);
	  
	  
      alert(`Status for ${ticketId} updated to ${newStatus}`);
    } catch (err) {
      console.warn('Update failed, fallback local', err);
      persistUpdateLocal(ticketId, newStatus);
      alert(`Status for ${ticketId} updated locally to ${newStatus}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">My Performing task</h2>
      <div className="bg-white shadow rounded p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No performing tasks</td>
                </tr>
              ) : tickets.map(t => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.raw?.ticket_id || t.raw?.TicketID || t.id || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.raw?.brand || t.raw?.device || t.raw?.brand_name || t.brand || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.raw?.issue_description || t.raw?.issue || t.raw?.problem || t.issue || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      t.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {t.status !== 'In Progress' && <button onClick={() => updateStatus(t, 'In Progress')} className="text-blue-600 hover:text-blue-900">Mark In Complete</button>}
                    {t.status !== 'Completed' && <button onClick={() => updateStatus(t, 'Completed')} className="text-green-600 hover:text-green-900">Mark Completed</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgeetWorkPerformingTask;