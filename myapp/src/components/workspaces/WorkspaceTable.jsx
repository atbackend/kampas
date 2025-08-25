import React, { useState, useMemo } from "react";
import { useTable, useSortBy, useGlobalFilter } from "react-table";
import { Search, ChevronUp, ChevronDown, Edit, Trash } from "lucide-react";
import { motion } from "framer-motion";

const WorkspaceTable = ({ data, onAddWorkspace, onEditWorkspace, onDeleteWorkspace , onRowClick}) => {
  const [globalFilter, setGlobalFilter] = useState("");

  // console.log("Workspace Data", data);

  if(!data){
    return <div>Loading...</div>
  }

  const columns = useMemo(
    () => [
      { Header: "Name", accessor: "name" },
      { Header: "Customer", accessor: "customer.name" },
      {
        Header: "Project Head",
        accessor: (row) =>
          `${row.project_head.first_name || ""} ${row.project_head.last_name || ""}`.trim(),
      },
      // { Header: "Project Head", accessor: "project_head.first_name project_head.first_name" },
      { Header: "Status", accessor: "status" },
      {
        Header: "Actions",
        Cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500"
              onClick={() => onEditWorkspace(row.original)} // Trigger edit
            >
              <Edit size={16} />
            </button>
            <button
              className="bg-red-600 text-white p-2 rounded-md hover:bg-red-500"
              onClick={() => onDeleteWorkspace(row.original)} // Trigger delete confirmation
            >
              <Trash size={16} />
            </button>
          </div>
        ),
      },
    ],
    [onEditWorkspace, onDeleteWorkspace]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter: setSearchFilter,
  } = useTable({ columns, data }, useGlobalFilter, useSortBy);

  const handleSearch = (e) => {
    const value = e.target.value || "";
    setGlobalFilter(value);
    setSearchFilter(value);
  };

  return (
    
    <div className="p-4 bg-gray-800 text-white rounded-md shadow-md">
      <div className="flex justify-between items-center mb-4">
        {/* Search Bar */}
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

        {/* Add User Button */}
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500"
          onClick={onAddWorkspace}
        >
          Add New Workspace
        </button>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <motion.table
          {...getTableProps()}
          className="min-w-full border-collapse border border-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()} className="bg-gray-700">
                {headerGroup.headers.map((column) => (
                  <th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
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
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, index) => {
              prepareRow(row);
              return (
                <motion.tr
                  {...row.getRowProps()}
                  className={`hover:bg-gray-700 ${
                    index % 2 === 0 ? "bg-gray-800" : "bg-gray-900"
                  }`}
                  initial={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 0.3 }}
                  key={row.id} 
                  // onClick={() => onRowClick(row.original)}
                >
                  {row.cells.map((cell) => {
                    const isProjectNameColumn = cell.column.id === "name";
                    return (
                      <td
                        {...cell.getCellProps()}
                        className="p-3 border-b border-gray-700 text-gray-300"
                        onClick={() => {
                          if (isProjectNameColumn){
                            onRowClick(row.original); // Trigger view
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

export default WorkspaceTable;
