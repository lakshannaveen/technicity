import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import UserService from '../services/UserService';
import RepairmanService from '../services/RepairmanService';
import { CircularProgress } from '@mui/material';

const AssignedRepairs = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [myRepairs, setMyRepairs] = useState([]);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startTicket, setStartTicket] = useState(null);
  const [startNote, setStartNote] = useState('');
  const [repairmanId, setRepairmanId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // full diagnosing list from server (or localStorage) — prefer showing these when available

  const [diagnosingList, setDiagnosingList] = useState([]);
  const [newPartRequest, setNewPartRequest] = useState({
    partName: '',
    quantity: 1,
    urgency: 'Normal',
    neededBy: ''
  });
  const [supplierInventory, setSupplierInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedPartsMap, setSelectedPartsMap] = useState({});
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [includePartsOnStart, setIncludePartsOnStart] = useState(false);

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

  // normalization helper used across loads
  const normalize = (item) => ({
    id: item.ticket_id || item.TicketID || item.id || item.device_id || item.DeviceID || item.barcode || item.barcodeValue || '',
    brand: item.brand || item.device || item.device_brand || item.brand_name || '',
    model: item.model || item.device_model || item.model_name || '',
    issue: item.issue_description || item.issue || item.problem || '',
    notes: item.notes || item.note || '',
    customerName: item.customer_name || item.customer || item.customerName || item.name || '',
    customerPhone: item.customer_phone || item.customerPhone || item.phone || item.contact || '',
    status: normalizeStatus(item.status || item.Status) || 'Diagnosing',
    assignedTo: item.assignedTo || item.assigned_to || item.repairman || item.assigned || item.rep_name || item.repName || '',
    repairman_id: item.repairman_id || item.RepairmanID || item.RepairmanId || item.repairmanId || '',


    assignedDate: item.assignedDate || item.assigned_date || item.assigned_on || '',
    createdAt: item.created_date || item.createdAt || item.created_at || item.date || '',
    raw: item
  });


  // Load assigned repairs from diagnosing endpoint (server only) — initial load & polling
  useEffect(() => {
    let mounted = true;

    const loadAssignedRepairs = async () => {
      setIsLoading(true);
      try {
        // Resolve repairman_id (prefer authoritative TestGetUserRole)
        const rawUser = user || {};
        const mobile = (rawUser.phone || rawUser.mobile || rawUser.MobileNo || rawUser.Mobile || rawUser.mobileNo || '').toString().replace(/\D/g, '');
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
                const n = normalizeToInt(c);
                if (n) { repairmanId = n; break; }
              }
            }
          } catch (e) { /* ignore */ }
        }

        // fallback: local cache
        if (!repairmanId) {
          try {
            const cached = JSON.parse(localStorage.getItem('repairmen') || '[]');
            if (Array.isArray(cached) && cached.length > 0) {
              const found = cached.find(r => {
                const names = [r.repairman_name, r.name, r.UserName, r.username, r.displayName].filter(Boolean).map(x => String(x).trim().toLowerCase());
                return names.includes(String(sessionStorage.getItem('rep_name') || user?.username || '').trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobile));
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
        }

        // fallback: query server repairmen list
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
              return names.includes(String(sessionStorage.getItem('rep_name') || user?.username || '').trim().toLowerCase()) || (r.repairman_contact && String(r.repairman_contact).replace(/\D/g, '') === String(mobile));
            });
            if (foundSrv) {
              const candidates = [foundSrv.RepairmanID, foundSrv.RepairmanId, foundSrv.repairman_id, foundSrv.id];
              for (const c of candidates) {
                const n = normalizeToInt(c);
                if (n) { repairmanId = n; break; }
              }
            }
          } catch (e) { /* ignore */ }
        }

        if (!repairmanId) {
          console.warn('Unable to resolve repairman_id; will attempt to load by name or fetch all.');
        }

        const fetchRobust = async (endpoint) => {
          let list = [];
          const userObj = JSON.parse(sessionStorage.getItem('user') || '{}');
          const username = String(userObj.username || '').trim();
          const repName = String(sessionStorage.getItem('rep_name') || '').trim();

          const targets = [];
          if (repairmanId) targets.push(`repairman_id=${repairmanId}`);
          if (username) targets.push(`rep_name=${encodeURIComponent(username)}`);
          if (repName && repName !== username) targets.push(`rep_name=${encodeURIComponent(repName)}`);
          targets.push(''); // full fetch fallback

          for (const t of targets) {
            const url = `https://teknicitybackend.dockyardsoftware.com/RepairTicket/${endpoint}${t ? '?' + t : ''}`;
            try {
              const res = await api.get(url);
              let candidate = [];
              if (res && res.data && (res.status === 200 || res.data.StatusCode === 200)) {
                if (Array.isArray(res.data.ResultSet)) candidate = res.data.ResultSet;
                else if (res.data.Result) {
                  try { candidate = JSON.parse(res.data.Result); } catch (e) { candidate = res.data.Result; }
                } else if (Array.isArray(res.data)) candidate = res.data;
              }
              if (Array.isArray(candidate) && candidate.length > 0) {
                list = candidate;
                break;
              }
            } catch (e) { /* ignore */ }

          }
          return list;
        };

        const diagList = await fetchRobust('GetDiagnosingRepairTickets');
        const normalizedDiag = (diagList || []).map(normalize);


        const retList = await fetchRobust('GetReturnedRepairTickets');




        const normalizedRet = (retList || []).map(item => {
          const n = normalize(item);
          // ensure returned items are clearly marked
          if (!n.status || String(n.status).trim() === '') n.status = 'Returned';
          return n;
        });

        // Merge and dedupe by ticket id — prefer Returned status, otherwise latest createdAt
        const byId = new Map();
        const upsert = (it) => {
          const key = String(it.id || (it.raw && (it.raw.ticket_id || it.raw.TicketID)) || '');
          if (!key) return;
          const existing = byId.get(key);
          if (!existing) { byId.set(key, it); return; }
          // prefer returned status
          if (String(existing.status) === 'Returned') return;
          if (String(it.status) === 'Returned') { byId.set(key, it); return; }
          // otherwise keep the newest by createdAt (or numeric id fallback)
          const ed = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
          const nd = it.createdAt ? new Date(it.createdAt).getTime() : 0;
          if (nd >= ed) { byId.set(key, it); }
        };

        normalizedDiag.forEach(upsert);
        normalizedRet.forEach(upsert);

        const merged = Array.from(byId.values());
        // sort newest-first
        merged.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (da || db) return db - da;
          const ai = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
          const bi = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
          return bi - ai;
        });

        if (mounted) {
          setRepairmanId(repairmanId);
          setDiagnosingList(merged);
          const myAssigned = merged.filter(t => {
            const ticketRepId = String(t.repairman_id || (t.raw && (t.raw.repairman_id || t.raw.RepairmanID || t.raw.RepairmanId)) || '').trim();
            const assigned = String(t.assignedTo || t.repName || t.rep_name || (t.raw && (t.raw.assignedTo || t.raw.assigned_to || t.raw.repairman || t.raw.rep_name || t.raw.repName)) || '').trim().toLowerCase();
            const target = String(user.username || '').trim().toLowerCase();
            const targetRepName = String(sessionStorage.getItem('rep_name') || '').trim().toLowerCase();

            const idMatch = repairmanId && String(ticketRepId) === String(repairmanId);
            const nameMatch = assigned === target || (targetRepName && assigned === targetRepName) || (assigned !== '' && target.includes(assigned)) || (target !== '' && assigned.includes(target));

            return idMatch || nameMatch;
          });
          setMyRepairs(myAssigned);
        }
      } catch (err) {
        if (mounted) {
          setDiagnosingList([]);
          setMyRepairs([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }

    };

    loadAssignedRepairs();
    const interval = setInterval(loadAssignedRepairs, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user.username]);

  // Filter-by-status removed: we display server results only



  // Show server results only. If the user has assigned repairs, show them; otherwise show the full diagnosing list.
  const displayRepairs = (myRepairs && myRepairs.length > 0) ? myRepairs : (diagnosingList || []);

  // allow passing extraFields (like issue_description) to be sent to server
  const updateRepairStatus = async (ticketOrId, newStatus, extraFields = {}) => {
    // ticketOrId can be the ticket object (preferred) or a ticket id string/number.
    let ticketObj = null;
    let ticketId = ticketOrId;
    if (ticketOrId && typeof ticketOrId === 'object') {
      ticketObj = ticketOrId;
      ticketId = (ticketObj.raw && (ticketObj.raw.ticket_id || ticketObj.raw.TicketID)) || ticketObj.id;
    } else {
      // try to find the ticket in diagnosingList
      const found = (diagnosingList || []).find(t => String(t.id) === String(ticketOrId) || (t.raw && (String(t.raw.ticket_id) === String(ticketOrId) || String(t.raw.TicketID) === String(ticketOrId))));
      if (found) ticketObj = found;
    }

    const buildParams = () => {
      const params = new URLSearchParams();
      params.append('ticket_id', ticketId);
      params.append('TicketID', ticketId);
      params.append('status', newStatus);
      params.append('Status', newStatus);

      // Explicitly append the repairman info so the ticket doesn't become abandoned or misclassified
      const repName = ticketObj?.repName || ticketObj?.assignedTo || (ticketObj?.raw && (ticketObj?.raw?.assignedTo || ticketObj?.raw?.assigned_to || ticketObj?.raw?.repairman)) || user.username || '';
      const repId = ticketObj?.repairmanId || ticketObj?.repairman_id || (ticketObj?.raw && (ticketObj?.raw?.repairman_id || ticketObj?.raw?.RepairmanId || ticketObj?.raw?.RepairmanID));

      if (repName) {
        params.append('assignedTo', repName);
        params.append('rep_name', repName);
      }
      if (repId) {
        params.append('repairman_id', repId);
      }

      if (extraFields && typeof extraFields === 'object') {
        Object.keys(extraFields).forEach(k => {
          const v = extraFields[k];
          if (typeof v !== 'undefined' && v !== null) params.append(k, String(v));
        });
      }

      if (ticketObj && ticketObj.raw && typeof ticketObj.raw === 'object') {
        Object.keys(ticketObj.raw).forEach(key => {
          const val = ticketObj.raw[key];
          if (val === null || typeof val === 'undefined') return;
          if (typeof val === 'object') {
            try { params.append(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
          } else {
            // Avoid overriding status or our explicitly injected IDs with old raw values
            if (!['status', 'Status', 'ticket_id', 'TicketID'].includes(key)) {
              params.append(key, String(val));
            }
          }
        });
      }
      return params;
    };

    try {
      const params = buildParams();
      // Use UpdateRepairTicketStatus for status changes because it correctly handles the state machine fields in the backend
      const res = await api.post('https://teknicitybackend.dockyardsoftware.com/RepairTicket/UpdateRepairTicketStatus', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Also dispatch UpdateRepairTicket to ensure extra fields like issue_description are captured.
      // Many systems isolate status state engines from general metadata.
      if (extraFields && Object.keys(extraFields).length > 0) {
        const metaParams = new URLSearchParams();
        metaParams.append('ticket_id', ticketId);
        Object.keys(extraFields).forEach(k => {
          metaParams.append(k, String(extraFields[k]));
        });
        const repName = ticketObj?.repName || ticketObj?.assignedTo || (ticketObj?.raw && (ticketObj?.raw?.assignedTo || ticketObj?.raw?.assigned_to || ticketObj?.raw?.repairman)) || user.username || '';
        const repId = ticketObj?.repairmanId || ticketObj?.repairman_id || (ticketObj?.raw && (ticketObj?.raw?.repairman_id || ticketObj?.raw?.RepairmanId || ticketObj?.raw?.RepairmanID)) || repairmanId;
        if (repName) metaParams.append('assignedTo', repName);
        if (repId) metaParams.append('repairman_id', repId);

        await api.post('https://teknicitybackend.dockyardsoftware.com/RepairTicket/UpdateRepairTicket', metaParams.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).catch(() => { /* non-fatal */ });
      }


      if (res && (res.status === 200 || (res.data && res.data.StatusCode === 200))) {
        // update in-memory state based on ticketId
        const updater = (ticket) => {
          const rawId = ticket && ticket.raw && (ticket.raw.ticket_id || ticket.raw.TicketID || ticket.raw.id);
          const normId = ticket && ticket.id;
          if (String(rawId) === String(ticketId) || String(normId) === String(ticketId)) {
            const updatedRaw = ticket.raw ? { ...ticket.raw, status: newStatus, ...(extraFields || {}) } : { ...(ticket.raw || {}), status: newStatus };
            return {
              ...ticket,
              status: newStatus,
              raw: updatedRaw,
              completedAt: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : ticket.completedAt
            };
          }
          return ticket;
        };

        const updatedDiagnosing = (diagnosingList || []).map(updater);
        setDiagnosingList(updatedDiagnosing);
        const myAssignedRepairs = (updatedDiagnosing || []).filter(ticket => String(ticket.assignedTo) === String(user.username));
        setMyRepairs(myAssignedRepairs);

        alert(`Repair status updated to ${newStatus}`);
        return;
      }
    } catch (err) {
      console.warn('UpdateRepairTicketStatus failed', err && err.message ? err.message : err);
    }

    // optimistic in-memory update if server fails or responds unexpectedly
    try {
      const updater = (ticket) => {
        const rawId = ticket && ticket.raw && (ticket.raw.ticket_id || ticket.raw.TicketID || ticket.raw.id);
        const normId = ticket && ticket.id;
        if (String(rawId) === String(ticketId) || String(normId) === String(ticketId)) {
          const updatedRaw = ticket.raw ? { ...ticket.raw, status: newStatus, ...(extraFields || {}) } : { ...(ticket.raw || {}), status: newStatus };
          return {
            ...ticket,
            status: newStatus,
            raw: updatedRaw,
            completedAt: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : ticket.completedAt
          };
        }
        return ticket;
      };

      const updatedDiagnosing = (diagnosingList || []).map(updater);
      setDiagnosingList(updatedDiagnosing);
      const myAssignedRepairs = (updatedDiagnosing || []).filter(ticket => String(ticket.assignedTo) === String(user.username));
      setMyRepairs(myAssignedRepairs);

      alert(`Repair status updated locally to ${newStatus}`);
    } catch (e) {
      console.error('Failed to update repair status locally', e);
      alert(`Failed to update status: ${e && e.message ? e.message : e}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Waiting for Parts': return 'bg-yellow-100 text-yellow-800';
      case 'Diagnosing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // date picker ref + helpers for the Parts Request modal (show a styled button, open hidden native picker)
  const dateInputRef = useRef(null);
  const formatToYMD = (d) => {
    if (!d) return 'yyyy/mm/dd';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    } catch (e) {
      return d;
    }
  };

  const openDatePicker = () => {
    if (!dateInputRef.current) return;
    // prefer showPicker if available (newer browsers), otherwise fallback to click()
    if (typeof dateInputRef.current.showPicker === 'function') {
      try { dateInputRef.current.showPicker(); return; } catch (e) { /* ignore and fallback */ }
    }
    dateInputRef.current.click();
  };

  const loadSupplierInventory = async () => {
    if (inventoryLoading) return;
    setInventoryLoading(true);
    try {
      const res = await api.get('/SupplierInventory/GetAllSupplierInventory');
      let list = [];
      if (res && res.data) {
        // try several common response shapes
        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.data.ResultSet)) list = res.data.ResultSet;
        else if (Array.isArray(res.data.Result)) list = res.data.Result;
        else if (Array.isArray(res.data.data)) list = res.data.data;
        else if (res.data.ResultSet && Array.isArray(res.data.ResultSet)) list = res.data.ResultSet;
      }

      // Debug: log the raw response once to help identify field names
      try { console.debug('SupplierInventory response sample:', Array.isArray(list) ? list.slice(0, 5) : list); } catch (e) { /* ignore */ }

      const mapped = (list || []).map((it, idx) => {
        const partName = it.partName || it.PartName || it.Part || it.name || it.part_name || it.Part_Name || '';
        // Prefer explicit part_id/inventory_id fields from backend when present, fall back to other ids
        const idVal = it.part_id || it.PartID || it.PartId || it.partId || it.inventory_id || it.InventoryID || it.id || it.ID || idx + 1;

        // robust stock detection across possible field names
        const stockCandidates = [
          it.stock, it.Stock, it.stock_quantity, it.Stock_Quantity, it.StockQuantity, it.stockQty,
          it.quantity, it.Quantity, it.available, it.Available, it.AvailableQuantity,
          it.availableQty, it.qty, it.Qty, it.currentStock, it.current_stock, it.inStock, it.InStock,
          it.available_quantity, it.Available_Quantity
        ];
        let stock = 0;
        for (const c of stockCandidates) {
          if (typeof c === 'number' && !Number.isNaN(c)) { stock = c; break; }
          if (typeof c === 'string' && c.trim() !== '') {
            const n = Number(c.toString().replace(/[^0-9.-]/g, ''));
            if (!Number.isNaN(n)) { stock = n; break; }
          }
        }

        const category = it.category || it.Category || it.partCategory || it.CategoryName || it.type || it.PartCategory || '';
        return { id: idVal, partName, category, stock: Number(stock || 0), raw: it };
      });
      setSupplierInventory(mapped);
    } catch (e) {
      console.warn('Failed to load supplier inventory', e && e.message ? e.message : e);
      setSupplierInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };



  const openStartModal = (ticket) => {
    setStartTicket(ticket);
    setSelectedTicket(ticket);
    setStartNote('');
    // load supplier inventory once when opening the start modal
    if (!supplierInventory || supplierInventory.length === 0) loadSupplierInventory();
    setShowStartModal(true);
  };

  const handleStartSubmit = async (e) => {
    e.preventDefault();
    if (!startTicket) return;
    console.debug('handleStartSubmit invoked', { startTicketId: startTicket && ((startTicket.raw && (startTicket.raw.ticket_id || startTicket.raw.TicketID)) || startTicket.id) });
    // optionally persist a note/expectedBy into the raw ticket before updating status locally
    try {
      const ticketId = (startTicket && startTicket.raw && (startTicket.raw.ticket_id || startTicket.raw.TicketID)) || startTicket.id;
      // compute new issue_description: overwrite with the technician note when a non-empty note is provided,
      // otherwise preserve the existing issue_description
      const existingIssueTop = (startTicket && startTicket.raw && (startTicket.raw.issue_description || startTicket.raw.issue)) || startTicket.issue || '';
      const noteTrim = typeof startNote === 'string' ? startNote.trim() : '';
      const newIssueTop = noteTrim !== '' ? startNote : existingIssueTop;

      // Determine if we should create part requests as part of starting
      // Treat any checked row as selected even if qty input is empty (default qty=1)
      const selectedIds = Object.keys(selectedPartsMap || {}).filter(k => selectedPartsMap[k]);
      console.debug('Start modal selection state', { includePartsOnStart, selectedPartsMap, selectedIds });
      // Trigger parts processing only if the checkbox is checked (manual part request removed)
      const shouldRequestParts = includePartsOnStart && selectedIds.length > 0;

      if (includePartsOnStart && selectedIds.length === 0) {
        console.debug('includePartsOnStart is true but no parts selected');
      }

      // Client-side validation: if any selected inventory item has no stock or insufficient stock,
      // prevent starting the task and inform the technician.
      if (shouldRequestParts && selectedIds.length > 0) {
        const insufficient = [];
        for (const id of selectedIds) {
          try {
            const sel = selectedPartsMap[id];
            const qty = Number(sel && sel.qty) || 1;
            const inv = (supplierInventory || []).find(it => String(it.id) === String(id));
            const stock = Number((inv && inv.stock) || 0);
            if (stock <= 0) insufficient.push({ part: (inv && inv.partName) || id, qty, stock, reason: 'out of stock' });
            else if (qty > stock) insufficient.push({ part: (inv && inv.partName) || id, qty, stock, reason: 'insufficient stock' });
          } catch (e) {
            // ignore malformed selection entries
          }
        }
        if (insufficient.length > 0) {
          const msgs = insufficient.map(i => `${i.part}: ${i.reason} (requested ${i.qty}, available ${i.stock})`);
          alert('Cannot start task due to stock issues:\n' + msgs.join('\n'));
          return;
        }
      }


      // Counter tracked across the parts processing block so we can compute final status
      let issuedSuccessCount = 0;

      // We'll optimistically annotate the ticket as 'In Progress' locally while
      // we attempt to issue parts. The final status will be computed after
      // we try to issue or request parts from supplier/backend.
      const initialStatus = 'In Progress';

      // Update in-memory state with start metadata so UI reflects the new note/status
      const updatedDiagnosing = (diagnosingList || []).map(t => {
        const rawId = t && t.raw && (t.raw.ticket_id || t.raw.TicketID || t.raw.id);
        const normId = t && t.id;
        if (String(rawId) === String(ticketId) || String(normId) === String(ticketId)) {
          const newRaw = { ...(t.raw || {}), startedBy: (user && user.username) || '', issue_description: newIssueTop };
          return { ...t, raw: newRaw, status: initialStatus };
        }
        return t;
      });
      setDiagnosingList(updatedDiagnosing);
      const myAssignedRepairs = (updatedDiagnosing || []).filter(ticket => String(ticket.assignedTo) === String(user.username));
      setMyRepairs(myAssignedRepairs);

      // Defer UpdateRepairTicket until after attempting to issue parts so IssuePart runs first
      // (we'll call UpdateRepairTicket after the parts block below)

      // If we need to request parts as part of starting, submit part requests now
      if (shouldRequestParts) {
        try {
          const ticketIdForPart = (startTicket && startTicket.raw && (startTicket.raw.ticket_id || startTicket.raw.TicketID)) || startTicket.id || '';
          const brandNameForPart = (startTicket && startTicket.raw && (startTicket.raw.brand || startTicket.raw.device || startTicket.brand)) || (startTicket && startTicket.brand) || '';

          const storedRequests = JSON.parse(localStorage.getItem('partsRequests') || '[]');
          const newSaved = [];

          // submit selected inventory items by issuing them (calls IssuePart to check/decrement supplier inventory)
          for (const id of selectedIds) {
            const sel = selectedPartsMap[id];
            const item = sel && sel.item;
            const qty = Number(sel && sel.qty) || 1;

            // IssuePart expects a minimal payload: inventory_id, part_name, quantity
            // Include ticket_id so backend can associate the issue with the ticket (avoid null ticket_id)
            const issuePayload = {
              ticket_id: Number(ticketIdForPart) || ticketIdForPart,
              inventory_id: item && item.id,
              part_name: (item && item.partName) || sel.partName || '',
              quantity: qty
            };

            try {
              console.debug('Calling IssuePart for', issuePayload, { itemId: item && item.id });
              const res = await api.post('/PartRequest/IssuePart', issuePayload, { headers: { 'Content-Type': 'application/json' } });
              console.debug('IssuePart response', res && res.status, res && res.data);

              // Accept any 2xx HTTP status as success, or legacy response shapes
              const ok = (res && res.status >= 200 && res.status < 300) || (res && res.data && (res.data.StatusCode === 200 || res.data.success === true));
              if (ok) {
                const serverAssignedId = (res.data && (res.data.id || res.data.insertId || res.data.ID)) || (storedRequests.length + newSaved.length + 1);
                newSaved.push({ id: serverAssignedId, ...issuePayload, createdAt: new Date().toISOString(), rawResponse: res.data });
                // Mark this inventory item as successfully issued
                issuedSuccessCount += 1;

                // decrement local supplierInventory stock for immediate UI feedback
                try {
                  setSupplierInventory(prev => (prev || []).map(it => {
                    if (String(it.id) === String(item && item.id)) {
                      const newStock = Math.max(0, Number(it.stock || 0) - Number(qty || 0));
                      return { ...it, stock: newStock };
                    }
                    return it;
                  }));
                } catch (e) { /* ignore */ }

                continue;
              }

              console.warn('IssuePart returned unexpected response', res && res.status, res && res.data);
              throw new Error('Unexpected server response');
            } catch (err) {
              console.error('IssuePart failed for', issuePayload.part_name, err && err.message ? err.message : err);
              // fallback: save as Waiting for Parts locally
              const newRequestId = storedRequests.length + newSaved.length + 1;
              const newRequest = {
                id: newRequestId,
                brand_name: brandNameForPart || (item && item.category) || '',
                ticket_id: ticketIdForPart,
                part_name: (item && item.partName) || sel.partName || '',
                quantity: qty,
                requestdate: sel && sel.requestdate ? sel.requestdate : new Date().toISOString().split('T')[0],
                status: 'Waiting for Parts',
                actions: 'Active',
                requestedBy: user.username,
                requestedDate: new Date().toISOString().split('T')[0],
                active: true,
                error: (err && (err.message || JSON.stringify(err))) || 'IssuePart failed'
              };
              newSaved.push(newRequest);
            }
          }

          // persist any created/collected requests
          try {
            const merged = [...storedRequests, ...newSaved];
            localStorage.setItem('partsRequests', JSON.stringify(merged));
          } catch (e) { /* ignore */ }

          // clear selection after submitting
          setSelectedPartsMap({});
        } catch (err) {
          // validation or submission error
          console.warn('Parts request on start failed', err && err.message ? err.message : err);
          alert('Failed to submit parts request: ' + (err && err.message ? err.message : err));
        }
      }

      // After attempting to issue/submit parts, compute final status and update the server.
      try {
        // Decide final status:
        // - If no parts were requested at all -> In Progress
        // - If supplier inventory items were selected: only 'In Progress' when all IssuePart calls succeeded
        let finalStatus = 'In Progress';
        if (shouldRequestParts && selectedIds.length > 0) {
          finalStatus = (issuedSuccessCount === selectedIds.length) ? 'In Progress' : 'Waiting for Parts';
        }

        console.debug('Parts processing summary', { ticketId: ticketId, selectedCount: selectedIds.length, issuedSuccessCount, finalStatus });

        await updateRepairStatus(startTicket, finalStatus, { issue_description: newIssueTop });
      } catch (e) {
        console.warn('Failed to call UpdateRepairTicket after parts processing', e && e.message ? e.message : e);
      }
    } catch (err) {
      console.warn('Failed to locally annotate start metadata', err);
      // fallback to In Progress if something unexpected happened
      updateRepairStatus(startTicket, 'In Progress');
    }

    setShowStartModal(false);
  };

  const handlePartRequestChange = (e) => {
    setNewPartRequest({
      ...newPartRequest,
      [e.target.name]: e.target.value
    });
  };

  const submitPartRequest = (e) => {
    e.preventDefault();

    if (!newPartRequest.partName || !newPartRequest.neededBy) {
      alert('Please fill in all required fields');
      return;
    }
    // Prepare payload for server
    const ticketId = (selectedTicket && selectedTicket.raw && (selectedTicket.raw.ticket_id || selectedTicket.raw.TicketID)) || (selectedTicket && selectedTicket.id) || '';
    const brandName = (selectedTicket && selectedTicket.raw && (selectedTicket.raw.brand || selectedTicket.raw.device || selectedTicket.brand)) || (selectedTicket && selectedTicket.brand) || '';

    const payload = {
      brand_name: brandName,
      ticket_id: ticketId,
      part_name: newPartRequest.partName,
      quantity: Number(newPartRequest.quantity) || 1,
      Urgency: newPartRequest.urgency,
      requestdate: newPartRequest.neededBy,
      status: 'Waiting for Parts',
      actions: 'Active',
      requestedBy: user.username
    };

    // Try to submit to server; fall back to localStorage on failure
    (async () => {
      try {
        const res = await api.post('https://teknicitybackend.dockyardsoftware.com/PartRequest/AddPartRequest', payload, {
          headers: { 'Content-Type': 'application/json' }
        });

        const ok = res && (res.status === 200 || res.status === 201 || (res.data && (res.data.StatusCode === 200 || res.data.success === true)));
        if (ok) {
          // persist locally for UI convenience
          try {
            const storedRequests = JSON.parse(localStorage.getItem('partsRequests') || '[]');
            const serverAssignedId = (res.data && (res.data.id || res.data.insertId || res.data.ID)) || (storedRequests.length > 0 ? Math.max(...storedRequests.map(r => r.id)) + 1 : 1);
            const savedRequest = { id: serverAssignedId, ...payload, createdAt: new Date().toISOString() };
            const updatedRequests = [...storedRequests, savedRequest];
            localStorage.setItem('partsRequests', JSON.stringify(updatedRequests));
          } catch (e) { /* ignore local persist errors */ }

          // Manual part requests should mark the ticket as Waiting for Parts
          if (selectedTicket) updateRepairStatus(selectedTicket, 'Waiting for Parts');

          setShowPartsModal(false);
          alert('Part request submitted successfully!');
          return;
        }
        throw new Error('Unexpected server response');
      } catch (err) {
        console.warn('PartRequest Add failed, falling back to localStorage', err && err.message ? err.message : err);
        // fallback to localStorage behavior
        try {
          const storedRequests = JSON.parse(localStorage.getItem('partsRequests') || '[]');
          const newRequestId = storedRequests.length > 0 ? Math.max(...storedRequests.map(r => r.id)) + 1 : 1;
          const newRequest = {
            id: newRequestId,
            ...newPartRequest,
            ticket_id: ticketId,
            brand_name: brandName,
            requestedBy: user.username,
            status: 'Waiting for Parts',
            requestdate: newPartRequest.neededBy,
            requestedDate: new Date().toISOString().split('T')[0],
            active: true
          };

          const updatedRequests = [...storedRequests, newRequest];
          localStorage.setItem('partsRequests', JSON.stringify(updatedRequests));

          // Manual part requests saved locally should mark the ticket as Waiting for Parts
          if (selectedTicket) updateRepairStatus(selectedTicket, 'Waiting for Parts');

          setShowPartsModal(false);
          alert('Part request saved locally (server unavailable).');
          return;
        } catch (e) {
          console.error('Failed to save part request locally', e);
          alert('Failed to submit part request: ' + (e && e.message ? e.message : e));
        }
      }
    })();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Assigned Repairs</h1>

        {/* Filter removed — showing server results only */}

        {/* Assigned Repairs Table */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Performing task</h2>

          {isLoading ? (
            <div className="py-8 text-center">
              <CircularProgress />
            </div>
          ) : displayRepairs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🔧</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assigned Repairs</h3>
              <p className="text-gray-600">Claim repairs from the available repairs page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayRepairs.map((ticket, idx) => (
                    <tr key={ticket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(ticket.raw && (ticket.raw.ticket_id || ticket.raw.TicketID)) || ticket.id || ticket.barcodeValue || ticket.barcode || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(ticket.raw && (ticket.raw.brand || ticket.raw.device || ticket.raw.brand_name)) || ticket.brand || ticket.device || ticket.brand_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(ticket.raw && (ticket.raw.issue_description || ticket.raw.issue || ticket.raw.problem)) || ticket.issue || ticket.issue_description || ticket.problem || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Plain status badge (dropdown removed) */}
                        {(() => {
                          const statusVal = (ticket.raw && (ticket.raw.status || ticket.raw.Status)) || ticket.status || 'Diagnosing';
                          return (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(statusVal)}`}>
                              {statusVal}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openStartModal(ticket)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition duration-150 mr-2"
                        >
                          Start Work
                        </button>

                        {/* Request Parts action removed per request */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Start Work Modal */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Start Task</h2>
                  <button
                    onClick={() => setShowStartModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {startTicket && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">Ticket: {(startTicket.raw && (startTicket.raw.ticket_id || startTicket.raw.TicketID)) || startTicket.id}</p>
                    <p className="text-sm text-gray-600">Device: {(startTicket.raw && (startTicket.raw.brand || startTicket.brand)) || '-'}</p>
                  </div>
                )}

                <form onSubmit={handleStartSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                      <textarea
                        rows={3}
                        value={startNote}
                        onChange={(e) => setStartNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Add any notes about the task, expected troubleshooting steps, or parts to check"
                      />
                    </div>

                    {/* Supplier Inventory selector (select one or more) */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Supplier Inventory</h3>
                      <p className="text-sm text-gray-600 mb-3">Select one or more items below to issue parts for this repair.</p>

                      <div className="flex items-center space-x-3 mb-3">
                        <input
                          type="text"
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          placeholder="Search by Part ID or Part Name"
                          className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setInventorySearch('')}
                          className="px-3 py-2 bg-gray-100 rounded-md"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="bg-white border rounded-md overflow-y-auto max-h-72">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500"> </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stock</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {(supplierInventory || []).filter(it => {
                              const q = inventorySearch.trim().toLowerCase();
                              if (!q) return true;
                              return String(it.id).toLowerCase().includes(q) || (it.partName || '').toLowerCase().includes(q);
                            }).map(item => {
                              const sel = selectedPartsMap[item.id] || null;
                              return (
                                <tr key={item.id}>
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={!!sel}
                                      onChange={(e) => {
                                        const next = { ...(selectedPartsMap || {}) };
                                        if (e.target.checked) next[item.id] = { qty: 1, item };
                                        else delete next[item.id];
                                        setSelectedPartsMap(next);
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{(item.raw && (item.raw.part_id || item.raw.PartID || item.raw.PartId || item.raw.partId || item.raw.inventory_id || item.raw.InventoryID)) || item.id}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{item.partName}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{item.category}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{item.stock}</td>
                                  <td className="px-4 py-3">
                                    <input
                                      type="number"
                                      min="1"
                                      disabled={!sel}
                                      value={sel ? sel.qty : ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const next = { ...(selectedPartsMap || {}) };
                                        if (!next[item.id]) next[item.id] = { qty: v || '', item };
                                        else next[item.id].qty = v;
                                        setSelectedPartsMap(next);
                                      }}
                                      className="w-20 px-2 py-1 border rounded"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                            {(supplierInventory || []).length === 0 && (
                              <tr>
                                <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                                  {inventoryLoading ? 'Loading inventory...' : 'No inventory items found.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* <div className="mt-3">
                        <label className="flex items-center space-x-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={includePartsOnStart}
                            onChange={(e) => setIncludePartsOnStart(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-purple-600"
                          />
                          <span>Issue selected parts as part of starting</span>
                        </label>
                      </div> */}
                    {/* expected completion date removed per request */}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowStartModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition duration-200"
                    >
                      Start Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedRepairs;