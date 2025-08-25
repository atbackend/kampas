import React, { useState, useMemo } from "react";
import { useTable, useSortBy, useGlobalFilter } from "react-table";
import { Search, ListFilter, ChevronUp, ChevronDown, Edit, Trash } from "lucide-react";
import { motion } from "framer-motion";

const UserTable = ({ users = [], onAddUser, onEditUser, onDeleteUser, roles, onRoleChange, onRowClick , onFilterClick}) => {
  const [globalFilter, setGlobalFilter] = useState("");

  // 🧠 Memoize columns
  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "first_name",
        id: "name",
        Cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
      },
      { Header: "Email", accessor: "email" },
      { 
        Header: "Role", 
        accessor: "role",
        Cell: ({ row }) => (
          <select
            value={row.original.role}
            onChange={(e) => onRoleChange(row.original, e.target.value )} // Update role on change
            className="bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring focus:ring-indigo-400"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))} 
          </select>
        ),
      },
      // Actions Column
      {
        Header: "Actions",
        Cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500"
              onClick={() => onEditUser(row.original)}
            >
              <Edit size={16} />
            </button>
            <button
              className="bg-red-600 text-white p-2 rounded-md hover:bg-red-500"
              onClick={() => onDeleteUser(row.original)}
            >
              <Trash size={16} />
            </button>
          </div>
        ),
      },
    ],
    [onEditUser, onDeleteUser, onRoleChange, roles]
  );

  // ✅ Always call hooks at top level
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter: setSearchFilter,
  } = useTable({ columns, data: users }, useGlobalFilter, useSortBy);

  const handleSearch = (e) => {
    const value = e.target.value || "";
    setGlobalFilter(value);
    setSearchFilter(value);
  };

  if (!users || users.length === 0) {
    return <div className="text-white p-4">Loading...</div>;
  }

  return (
    <div className="p-4 bg-gray-800 text-white rounded-md shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input
            type="text"
            className="p-2 pl-10 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-indigo-400 text-white placeholder-gray-400"
            placeholder="Search..."
            value={globalFilter}
            onChange={handleSearch}
          />
        </div>

        
        {/* Right: Filter + Add User */}
        <div className="flex items-center space-x-2">
          <button
            className="bg-gray-600 text-white h-10 px-4 py-2 rounded-md hover:bg-indigo-500"
            onClick={onAddUser}
          >
            Add New User
          </button>

          <button
            className="bg-gray-600 text-white h-10 px-4 py-2 rounded-md hover:bg-indigo-500"
            onClick={onFilterClick}
            title="Filter"
          >
            <ListFilter className="mr-2" size={24} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <motion.table
          {...getTableProps()}
          className="min-w-full border-collapse border border-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <thead>
            {headerGroups.map((headerGroup, i) => {
              const { key, ...restGroupProps } = headerGroup.getHeaderGroupProps();
              return (
                <tr key={key || i} {...restGroupProps} className="bg-gray-700">
                  {headerGroup.headers.map((column, j) => {
                    const headerProps = column.getHeaderProps(column.getSortByToggleProps());
                    const { key: colKey, ...restColProps } = headerProps;
                    return (
                      <th
                        key={colKey || j}
                        {...restColProps}
                        className="p-3 text-left text-gray-300 font-semibold border-b border-gray-600"
                      >
                        {column.render("Header")}
                        <span className="ml-1">
                          {column.isSorted ? (
                            column.isSortedDesc ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronUp size={16} />
                            )
                          ) : (
                            ""
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              );
            })}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, index) => {
              prepareRow(row);
              const { key: rowKey, ...rowProps } = row.getRowProps();
              return (
                <motion.tr
                  key={rowKey || index}
                  {...rowProps}
                  className={`hover:bg-gray-700 ${
                    index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                  }`}
                  initial={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {row.cells.map((cell, cellIndex) => {
                    const isNameColumn = cell.column.id === "name";
                    const { key: cellKey, ...cellProps } = cell.getCellProps();
                    return (
                      <td
                        key={cellKey || cellIndex}
                        {...cellProps}
                        className="p-3 border-b border-gray-700 text-gray-300"
                        onClick={() => {
                          if (isNameColumn) {
                            onRowClick(row.original);
                          }
                        }}
                      >
                        {cell.render("Cell")}
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </motion.table>
      </div>
    </div>
  );
};

export default UserTable;
