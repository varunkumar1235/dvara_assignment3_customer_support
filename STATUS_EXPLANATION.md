# Ticket Status Explanation

## Resolved vs Closed

### **Resolved**

- **Meaning**: The issue has been fixed/solved by the agent
- **Use Case**: Agent has completed the work and the problem is solved
- **Next Step**: Waiting for customer confirmation
- **Customer Action**: Customer can click "Confirm Issue is Fixed" button to close the ticket
- **Can be reopened**: Yes, if customer reports the issue persists and clicks on "Reject - Not Satisfied"
- **Example**: Agent fixed a bug, deployed the fix, and marked as "resolved" - waiting for customer to confirm it works

### **Closed**

- **Meaning**: The ticket is completely finished and archived
- **Use Case**: Customer confirmed the fix works by clicking the confirmation button
- **Next Step**: Ticket is archived, no further action needed
- **How it happens**: Automatically when customer confirms a resolved ticket
- **Can be reopened**: Typically no (though system may allow reopening in some cases)
- **Example**: Customer confirmed the bug fix works perfectly, ticket is automatically "closed" and archived

### **Workflow**

```
Open → In Progress → Resolved → [Customer Confirms] → Closed
```

1. **Open**: Ticket created, waiting for agent
2. **In Progress**: Agent is working on it
3. **Resolved**: Agent fixed it, waiting for customer confirmation
   - Customer sees a "Confirm Issue is Fixed" button
   - Customer clicks the button to confirm
4. **Closed**: Automatically set when customer confirms, ticket archived

### **Key Difference**

- **Resolved** = "I fixed it, please verify" (Customer can confirm)
- **Closed** = "Customer confirmed, everything is done, ticket finished" (Automatic after customer confirmation)
