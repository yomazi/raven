import { useContacts, useDeleteContact } from "@hooks/useContacts.js";
import { useDeleteGroup, useGroups } from "@hooks/useGroups.js";
import ConfirmModal from "@modals/ConfirmModal/ConfirmModal.jsx";
import ContactModal from "@modals/ContactModal/ContactModal.jsx";
import GroupModal from "@modals/GroupModal/GroupModal.jsx";
import { useState } from "react";
import styles from "./ContactsPanel.module.css";

export default function ContactsPanel() {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();

  const deleteContact = useDeleteContact();
  const deleteGroup = useDeleteGroup();

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // { type: 'contact'|'group', id, label }

  function openCreateContact() {
    setEditingContact(null);
    setContactModalOpen(true);
  }

  function openEditContact(contact) {
    setEditingContact(contact);
    setContactModalOpen(true);
  }

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupModalOpen(true);
  }

  function openEditGroup(group) {
    setEditingGroup(group);
    setGroupModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === "contact") await deleteContact.mutateAsync(pendingDelete.id);
    else await deleteGroup.mutateAsync(pendingDelete.id);
  }

  const isLoading = contactsLoading || groupsLoading;

  if (isLoading) {
    return <div className={styles.empty}>Loading…</div>;
  }

  return (
    <div className={styles.root}>
      {/* ── Groups ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.heading}>Groups</span>
          <button className="primary" onClick={openCreateGroup}>
            + New Group
          </button>
        </div>

        {groups.length === 0 && <div className={styles.sectionEmpty}>No groups yet.</div>}

        <div className={styles.groupGrid}>
          {groups.map((group) => (
            <div key={group._id} className={styles.groupCard}>
              <div className={styles.groupCardHeader}>
                <span className={styles.groupName}>{group.name}</span>
                <div className={styles.rowActions}>
                  <button className={styles.iconBtn} onClick={() => openEditGroup(group)}>
                    Edit
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() =>
                      setPendingDelete({ type: "group", id: group._id, label: group.name })
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className={styles.memberChips}>
                {(group.contacts ?? []).length === 0 && (
                  <span className={styles.noMembers}>No members</span>
                )}
                {(group.contacts ?? []).map((c) => (
                  <span key={c._id} className={styles.chip} title={c.email}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contacts ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.heading}>Contacts</span>
          <button className="primary" onClick={openCreateContact}>
            + New Contact
          </button>
        </div>

        {contacts.length === 0 && <div className={styles.sectionEmpty}>No contacts yet.</div>}

        <div className={styles.contactList}>
          {contacts.map((contact) => (
            <div key={contact._id} className={styles.contactRow}>
              <span className={styles.contactName}>{contact.name}</span>
              <span className={styles.contactEmail}>{contact.email}</span>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} onClick={() => openEditContact(contact)}>
                  Edit
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={() =>
                    setPendingDelete({ type: "contact", id: contact._id, label: contact.name })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ContactModal
        key={contactModalOpen ? editingContact?._id ?? "new" : "closed"}
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        contact={editingContact}
      />

      <GroupModal
        key={groupModalOpen ? (editingGroup?._id ?? "new-group") : "closed-group"}
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        group={editingGroup}
      />

      <ConfirmModal
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.type ?? "item"}?`}
        message={`Are you sure you want to delete "${pendingDelete?.label}"? This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        danger
      />
    </div>
  );
}
